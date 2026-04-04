# 📚 Lecture Notes Processor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hosted on GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-blue)](https://pages.github.com/)
[![Powered by Groq](https://img.shields.io/badge/Powered%20by-Groq%20Llama%203.3%2070B-green)](https://groq.com)

> **Turn your lecture PDFs into exam-ready summaries and flashcards — 100% free, runs in your browser, no data leaves your device.**

## 🔗 Live Demo

👉 **[https://Amika1118.github.io/lecture-processor/](https://Amika1118.github.io/lecture-processor/)**

---

## 🎯 What It Does

Upload a lecture PDF and get back, in seconds:

- ✅ A **5-point exam-focused summary** — highlights what's actually likely to be tested
- ✅ **5 Q&A flashcards** — built for active recall, not passive reading
- ✅ An auto-generated **topic label** — so you can stay organised across multiple files

PDF text is extracted **entirely in your browser** using Mozilla PDF.js. Your files are never uploaded to any server.

---

## ⚡ Why Not Just Use ChatGPT or Claude?

| | This Tool | ChatGPT / Claude |
|---|---|---|
| **Cost** | Free (no card needed) | Subscription or pay-per-token |
| **Privacy** | PDF stays in your browser | Uploaded to external servers |
| **Speed** | ~1-2 sec per PDF | Slower, varies |
| **Daily limit** | 14,400 requests (Groq free tier) | Low free limits |
| **Exam focus** | Prompt-engineered for it | Requires manual prompting |

---

## 🚀 Getting Started

### 1. Get a free Groq API key

No credit card required.

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up with Google, GitHub, or email
3. Go to **API Keys → Create API Key**
4. Copy the key — it starts with `gsk_`

### 2. Use the tool

1. Open the [live site](https://Amika1118.github.io/lecture-processor/)
2. Paste your API key into the field
3. Drag and drop your PDFs (or click to browse)
4. Click **"Process all PDFs (FREE)"**
5. View your summary and flashcards — click any card to expand it

> **Tip:** Use the **"Copy flashcard commands"** button to export to Anki or similar apps.

---

## ⚙️ Built-in Safeguards

| Feature | What It Does |
|---|---|
| Daily request counter | Tracks usage across refreshes (stored in `localStorage`) |
| Exponential backoff | Auto-retries on Groq 429 rate-limit errors (up to 3x) |
| Scanned PDF detection | Warns you if no selectable text is found |
| File size limit | Rejects files over 25 MB to keep the browser responsive |
| Configurable delay | Add a pause between calls to avoid per-minute limits |
| Batch limit | Process a subset of your queue at a time |

---

## 📂 Project Structure

```
lecture-processor/
├── index.html       # Main UI - modal, drag zone, result cards
├── css/
│   └── styles.css   # Dark theme, responsive layout, modal styles
└── js/
    └── script.js    # PDF extraction, Groq API, rate limiting, UI logic
```

---

## 🛠️ Run Locally

```bash
git clone https://github.com/Amika1118/lecture-processor.git
cd lecture-processor
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

---

## ☁️ Deploy to GitHub Pages

1. Push the repo to GitHub
2. Go to **Settings → Pages**
3. Set branch to `main`, folder to `/ (root)`
4. Click **Save**

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| "Could not extract enough text" | Your PDF is likely scanned. Run it through OCR first (Adobe Acrobat, Tesseract, Smallpdf). |
| "Daily request limit reached" | Wait until midnight (counter resets based on your browser clock). |
| "Rate limit (429)" | The tool retries automatically. If it keeps failing, reduce batch size or increase the delay. |
| File upload fails | File must be `.pdf` and under 25 MB. |
| Nothing happens after clicking Process | Check your API key is valid and that the PDF contains selectable text. |

---

## 🙏 Credits

- [Groq](https://groq.com) - blazing-fast free inference via Llama 3.3 70B
- [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) - client-side PDF text extraction
- [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) - clean monospace UI font

---

## 📄 License

MIT - free for personal and educational use.

---

*Built for students who want to study smarter, not harder.*
