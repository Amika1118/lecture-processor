/**
 * Lecture Notes Processor - Groq AI Edition
 * 
 * Features:
 * - PDF text extraction using pdf.js (client-side)
 * - Send extracted text to Groq (Llama 3.3 70B) for exam-focused summaries and flashcards
 * - Daily request limiting with localStorage persistence
 * - Configurable delays + exponential backoff on rate limits (429)
 * - Max files per batch control
 * - Scanned PDF detection (warns if extracted text < 100 chars)
 * - File size limit (25MB max)
 * - Collapsible UI, drag & drop, real-time status updates
 * - Onboarding flow: guides user to get a free Groq API key
 * 
 * Author: Uni Companion
 * License: MIT
 */

// ======================== GLOBAL STATE ========================
let files = [];           // Array of uploaded File objects
let results = [];        // Processed results (topic, summary, flashcards)
let doneCount = 0;       // Number of successfully processed files
let totalCards = 0;      // Total flashcards generated
let isProcessing = false; // Flag to prevent concurrent processing
let stopRequested = false; // User requested stop
let processingAborted = false; // Aborted due to error/limit

// Daily request tracking (persisted in localStorage)
let requestsToday = 0;
let requestDate = new Date().toDateString();

// ======================== PERSISTENT DAILY COUNTER ========================

/**
 * Load daily request count from localStorage (resets if date changed)
 */
function loadDailyCount() {
  const stored = localStorage.getItem('groq_daily_requests');
  const storedDate = localStorage.getItem('groq_daily_date');
  const today = new Date().toDateString();
  if (storedDate === today && stored !== null) {
    requestsToday = parseInt(stored, 10) || 0;
  } else {
    requestsToday = 0;
    localStorage.setItem('groq_daily_date', today);
    localStorage.setItem('groq_daily_requests', '0');
  }
  requestDate = today;
}

/**
 * Save current daily request count to localStorage
 */
function saveDailyCount() {
  localStorage.setItem('groq_daily_requests', requestsToday.toString());
  localStorage.setItem('groq_daily_date', requestDate);
}

/**
 * Increment daily counter and persist
 */
function incrementDailyCount() {
  requestsToday++;
  saveDailyCount();
}

// ======================== UTILITY FUNCTIONS ========================

/**
 * Sleep helper for delays between API calls
 * @param {number} ms - milliseconds to sleep
 * @returns {Promise} - resolves after ms
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - input string
 * @returns {string} - escaped string
 */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Display a warning/error message to the user
 * @param {string} msg - message text
 * @param {boolean} isError - if true, red styling; else green/accent
 */
function showLimitWarning(msg, isError = true) {
  const warnDiv = document.getElementById('limit-warning');
  warnDiv.style.display = 'block';
  warnDiv.innerHTML = msg;
  warnDiv.style.borderLeftColor = isError ? 'var(--red)' : 'var(--accent)';
  setTimeout(() => {
    if (warnDiv) warnDiv.style.display = 'none';
  }, 6000);
}

/**
 * Exponential backoff retry for rate-limited API calls
 * @param {Function} fn - async function to retry
 * @param {number} maxRetries - max retry attempts (default 3)
 * @returns {Promise} - result of fn
 */
async function withExponentialBackoff(fn, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err.message && (err.message.includes('429') || err.message.toLowerCase().includes('rate limit'));
      if (!isRateLimit || attempt === maxRetries - 1) throw err;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.warn(`Rate limited, retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
      attempt++;
    }
  }
}

// ======================== API KEY ONBOARDING FLOW ========================

/**
 * Show the modal with step-by-step instructions to get a free Groq API key
 */
function showKeyInstructionsModal() {
  const modal = document.getElementById('key-instruction-modal');
  if (modal) modal.style.display = 'block';
}

/**
 * Close the instructions modal
 */
function closeKeyInstructionsModal() {
  const modal = document.getElementById('key-instruction-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * Check if the user has entered a Groq API key.
 * If not, show the instruction modal and return false.
 * @returns {boolean} - true if key exists, false otherwise
 */
function ensureGroqKey() {
  const apiKey = document.getElementById('groq-key').value.trim();
  if (apiKey) return true;
  showKeyInstructionsModal();
  return false;
}

// Initialize modal event listeners
function initModalEvents() {
  const modal = document.getElementById('key-instruction-modal');
  if (!modal) return;
  const closeBtn = modal.querySelector('.modal-close');
  const okBtn = document.getElementById('modal-ok-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeKeyInstructionsModal);
  if (okBtn) okBtn.addEventListener('click', () => {
    closeKeyInstructionsModal();
    document.getElementById('groq-key').focus();
  });
  window.addEventListener('click', (e) => {
    if (e.target === modal) closeKeyInstructionsModal();
  });
}

// ======================== PDF TEXT EXTRACTION (pdf.js) ========================

/**
 * Extract plain text from a PDF file using pdf.js
 * @param {File} file - PDF file object
 * @returns {Promise<string>} - extracted text
 */
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

// ======================== GROQ API COMMUNICATION ========================

/**
 * Call Groq API with extracted PDF text and get exam-focused summary + flashcards
 * Wrapped with exponential backoff for rate limits.
 * @param {File} pdfFile - original PDF file (for text extraction)
 * @param {string} fileName - original filename (for fallback topic)
 * @returns {Promise<Object>} - parsed result {topic, summary, flashcards, filename}
 */
async function callGroq(pdfFile, fileName) {
  const apiKey = document.getElementById('groq-key').value.trim();
  if (!apiKey) throw new Error('Groq API key missing. Get one from console.groq.com');

  // Extract text from PDF
  const extractedText = await extractTextFromPDF(pdfFile);
  
  // Scanned PDF detection: if extracted text is very short, likely image-based
  if (!extractedText || extractedText.trim().length < 100) {
    throw new Error('This PDF appears to be a scanned image (no selectable text). The processor only works with text-based PDFs. Try using OCR software first.');
  }

  // Groq context limit ~8K tokens ≈ 32,000 characters; truncate safely
  const maxChars = 28000;
  const truncatedText = extractedText.length > maxChars 
    ? extractedText.slice(0, maxChars) + "\n[...truncated due to length]" 
    : extractedText;

  const prompt = `You are a university study assistant. Based on the lecture text below, produce EXACTLY this format:

SUMMARY (exam focus):
- [key concept likely to appear on exam 1]
- [key concept likely to appear on exam 2]
- [key concept likely to appear on exam 3]
- [key concept likely to appear on exam 4]
- [key concept likely to appear on exam 5]

FLASHCARDS:
Q: [exam-style question testing a key fact or concept]
A: [concise answer]
Q: [question]
A: [answer]
Q: [question]
A: [answer]
Q: [question]
A: [answer]
Q: [question]
A: [answer]

TOPIC: [short descriptive topic name, max 6 words]

Lecture text:
${truncatedText}`;

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 1500
  };

  // Wrap the fetch in withExponentialBackoff to handle 429
  const makeRequest = async () => {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (resp.status === 429) throw new Error('429 Rate limit exceeded');
    if (resp.status === 401) throw new Error('Invalid Groq API key.');
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
    return resp;
  };

  const resp = await withExponentialBackoff(makeRequest, 3);
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response from Groq');
  return parseResult(text, fileName);
}

/**
 * Parse the AI response text into structured summary, flashcards, and topic
 * Supports both "SUMMARY (exam focus):" and legacy "SUMMARY:" formats
 * @param {string} text - raw AI response
 * @param {string} filename - original filename for fallback topic
 * @returns {Object} - {topic, summary, flashcards, filename}
 */
function parseResult(text, filename) {
  let summaryMatch = text.match(/SUMMARY\s*\(exam focus\):\s*([\s\S]*?)(?=FLASHCARDS:)/i);
  if (!summaryMatch) {
    summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=FLASHCARDS:)/i);
  }
  const flashcardsMatch = text.match(/FLASHCARDS:\s*([\s\S]*?)(?=TOPIC:|$)/i);
  const topicMatch = text.match(/TOPIC:\s*(.+)/i);

  let summary = [];
  if (summaryMatch) {
    summary = summaryMatch[1].trim()
      .split('\n')
      .map(l => l.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  } else {
    summary = ['Summary extraction failed'];
  }

  const flashcards = [];
  if (flashcardsMatch) {
    const lines = flashcardsMatch[1].trim().split('\n');
    let q = null;
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('Q:')) q = t.slice(2).trim();
      else if (t.startsWith('A:') && q) {
        flashcards.push({ q, a: t.slice(2).trim() });
        q = null;
      }
    }
  }

  const topic = topicMatch ? topicMatch[1].trim() : filename.replace(/\.pdf$/i, '').slice(0, 40);
  return { topic, summary, flashcards, filename };
}

// ======================== FILE PROCESSING (per file) ========================

/**
 * Process a single PDF file: validate size, extract text, call Groq, update UI
 * @param {File} file - PDF file
 * @param {number} index - position in files array (for UI status)
 * @returns {Promise<Object>} - parsed result
 */
async function processFile(file, index) {
  // File size check (25MB max)
  const maxSizeMB = 25;
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    throw new Error(`File exceeds ${maxSizeMB}MB (${fileSizeMB.toFixed(1)}MB). Please use a smaller PDF.`);
  }

  setFileStatus(index, 'reading PDF...', 'processing');

  // Daily limit check with persisted counter
  const today = new Date().toDateString();
  if (today !== requestDate) {
    requestsToday = 0;
    requestDate = today;
    saveDailyCount();
  }
  const dailyLimit = parseInt(document.getElementById('daily-limit').value, 10);
  if (requestsToday >= dailyLimit) {
    throw new Error(`Daily request limit (${dailyLimit}) reached. Adjust limit in settings or try tomorrow.`);
  }

  setFileStatus(index, 'AI processing...', 'processing');
  const result = await callGroq(file, file.name);
  incrementDailyCount();
  setFileStatus(index, 'done ✓', 'done');
  return result;
}

// ======================== UI UPDATE FUNCTIONS ========================

/**
 * Render the list of uploaded files with status badges
 */
function renderFileList() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';
  files.forEach((f, i) => {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.id = `file-item-${i}`;
    el.innerHTML = `
      <span class="file-badge">PDF</span>
      <span class="file-name">${esc(f.name)}</span>
      <span class="file-status" id="fstatus-${i}">queued</span>
    `;
    list.appendChild(el);
  });
  const show = files.length > 0;
  document.getElementById('stats-section').style.display = show ? 'block' : 'none';
  document.getElementById('action-section').style.display = show ? 'flex' : 'none';
  document.getElementById('stat-total').textContent = files.length;
  document.getElementById('stat-done').textContent = doneCount;
  document.getElementById('stat-cards').textContent = totalCards;
}

/**
 * Update the status text and CSS class for a specific file item
 * @param {number} idx - file index
 * @param {string} text - status message
 * @param {string} cls - CSS class (done, error, processing)
 */
function setFileStatus(idx, text, cls) {
  const span = document.getElementById(`fstatus-${idx}`);
  const item = document.getElementById(`file-item-${idx}`);
  if (span) { span.textContent = text; span.className = `file-status ${cls}`; }
  if (item) item.className = `file-item ${cls}`;
}

/**
 * Append a result card to the results container
 * @param {Object} r - result object {topic, summary, flashcards}
 * @param {number} idx - index in results array (for toggle/copy)
 */
function renderResult(r, idx) {
  const container = document.getElementById('results');
  const card = document.createElement('div');
  card.className = 'result-card';
  const summaryHtml = r.summary.map(s => `<div class="summary-item"><span style="color:var(--accent); margin-right:8px;">—</span>${esc(s)}</div>`).join('');
  const fcHtml = r.flashcards.map(fc => `
    <div class="flashcard">
      <div class="fc-q">📘 ${esc(fc.q)}</div>
      <div style="height:1px; background:var(--border); margin:6px 0;"></div>
      <div class="fc-a">📌 ${esc(fc.a)}</div>
    </div>
  `).join('');
  card.innerHTML = `
    <div class="result-header" onclick="toggleBody(${idx})">
      <span class="result-topic">📖 ${esc(r.topic)}</span>
      <span class="result-meta"><span>${r.flashcards.length} cards</span><span id="chevron-${idx}">▼</span></span>
    </div>
    <div class="result-body open" id="rbody-${idx}">
      <div class="section-label">📌 EXAM-FOCUSED SUMMARY</div>
      <div class="summary-list">${summaryHtml}</div>
      <div class="section-label">🧠 FLASHCARDS</div>
      <div class="fc-grid">${fcHtml}</div>
      <div style="margin-top:12px;"><button class="copy-btn" onclick="copyBotCmds(${idx})">📋 Copy /flashcard commands</button> <span id="copied-${idx}" style="font-size:10px; color:var(--accent); margin-left:8px; display:none;">✓</span></div>
    </div>
  `;
  container.appendChild(card);
}

// Global functions for inline onclick handlers (exposed to window)
window.toggleBody = function(idx) {
  const body = document.getElementById(`rbody-${idx}`);
  const ch = document.getElementById(`chevron-${idx}`);
  if (body.classList.contains('open')) {
    body.classList.remove('open');
    if (ch) ch.textContent = '▼';
  } else {
    body.classList.add('open');
    if (ch) ch.textContent = '▲';
  }
};

window.copyBotCmds = function(idx) {
  const r = results[idx];
  if (!r) return;
  const text = r.flashcards.map(fc => `/flashcard add "${fc.q.replace(/"/g, '\\"')}" -> "${fc.a.replace(/"/g, '\\"')}"`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const el = document.getElementById(`copied-${idx}`);
    if (el) { el.style.display = 'inline'; setTimeout(() => el.style.display = 'none', 1500); }
  });
};

// ======================== MAIN PROCESSING LOOP ========================

/**
 * Start processing all queued files sequentially with configured delays and limits
 */
window.startProcessing = async function() {
  if (isProcessing) { showLimitWarning("Already processing, please wait.", false); return; }

  if (!ensureGroqKey()) return;
  if (files.length === 0) return;

  const maxFiles = parseInt(document.getElementById('max-files-limit').value, 10);
  let filesToProcess = Math.min(files.length, maxFiles);
  if (files.length > maxFiles) {
    showLimitWarning(`⚠️ Only processing first ${maxFiles} of ${files.length} files (limit set in advanced).`, false);
  }

  // Reset processing state
  isProcessing = true;
  stopRequested = false;
  processingAborted = false;
  doneCount = 0;
  totalCards = 0;
  results = [];
  document.getElementById('results').innerHTML = '';
  document.getElementById('process-btn').disabled = true;
  document.getElementById('stop-btn').disabled = false;
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('stat-done').textContent = '0';
  document.getElementById('stat-cards').textContent = '0';
  document.getElementById('limit-warning').style.display = 'none';

  const delayMs = parseInt(document.getElementById('api-delay').value, 10);

  for (let i = 0; i < filesToProcess; i++) {
    if (stopRequested) {
      showLimitWarning(`⏸️ Stopped by user. ${doneCount} files completed.`, false);
      break;
    }
    if (i > 0 && delayMs > 0) await sleep(delayMs);

    try {
      const result = await processFile(files[i], i);
      if (result) {
        doneCount++;
        totalCards += result.flashcards.length;
        results.push(result);
        renderResult(result, results.length - 1);
      }
    } catch (err) {
      showLimitWarning(`❌ ${files[i].name}: ${err.message}`, true);
      setFileStatus(i, 'error', 'error');
    }
    document.getElementById('stat-done').textContent = doneCount;
    document.getElementById('stat-cards').textContent = totalCards;
    const progress = Math.round((i + 1) / filesToProcess * 100);
    document.getElementById('progress-fill').style.width = `${progress}%`;
  }

  isProcessing = false;
  document.getElementById('process-btn').disabled = false;
  document.getElementById('stop-btn').disabled = true;
  if (doneCount === filesToProcess && !stopRequested) {
    showLimitWarning(`✅ Complete! Processed ${doneCount} lectures · ${totalCards} flashcards · Groq free tier`, false);
  }
};

window.stopProcessing = function() {
  if (isProcessing) {
    stopRequested = true;
    showLimitWarning("Stopping after current file...", false);
    document.getElementById('stop-btn').disabled = true;
  }
};

// ======================== FILE MANAGEMENT ========================

/**
 * Add new PDF files to the queue (prevents duplicates, checks size)
 * @param {FileList|Array} newFiles - array of File objects
 */
function addFiles(newFiles) {
  if (isProcessing) { showLimitWarning("Processing in progress, cannot add files.", true); return; }
  
  const maxSizeMB = 25;
  const validFiles = [];
  for (const f of newFiles) {
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      showLimitWarning(`⚠️ ${f.name} exceeds ${maxSizeMB}MB (${sizeMB.toFixed(1)}MB) and was skipped.`, true);
      continue;
    }
    if (!files.find(x => x.name === f.name)) validFiles.push(f);
  }
  
  files.push(...validFiles);
  doneCount = 0;
  totalCards = 0;
  results = [];
  document.getElementById('results').innerHTML = '';
  renderFileList();
  document.getElementById('progress-fill').style.width = '0%';
}

// ======================== UI COLLAPSIBLE ========================

window.toggleConfig = function() {
  const body = document.getElementById('config-body');
  const chev = document.getElementById('config-chevron');
  body.classList.toggle('open');
  chev.textContent = body.classList.contains('open') ? '▲' : '▼';
};

// ======================== EVENT LISTENERS & INIT ========================

document.addEventListener('DOMContentLoaded', () => {
  // Load persisted daily counter
  loadDailyCount();

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const needKeyBtn = document.getElementById('need-key-btn');

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const pdfs = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
    if (pdfs.length) addFiles(pdfs);
    else showLimitWarning("Only PDF files are supported.", true);
  });

  fileInput.addEventListener('change', () => {
    addFiles([...fileInput.files]);
    fileInput.value = '';
  });

  if (needKeyBtn) {
    needKeyBtn.addEventListener('click', showKeyInstructionsModal);
  }

  initModalEvents();
  renderFileList();
});