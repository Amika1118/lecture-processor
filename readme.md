Here's a complete `README.md` file for your repository. Copy and paste this into a new file named `README.md` in your project folder (or add it directly on GitHub after uploading).

```markdown
# 📚 Lecture Notes Processor – Free AI Study Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hosted on GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-blue)](https://pages.github.com/)
[![Groq API](https://img.shields.io/badge/Powered%20by-Groq%20(Llama%203.3%2070B)-green)](https://groq.com)

> **Turn your lecture PDFs into exam-focused summaries and flashcards – 100% free, no server, no hidden costs.**

## ✨ Live Demo

👉 **[Use the Processor Live](https://YOUR_USERNAME.github.io/lecture-processor/)**  
*(Replace `YOUR_USERNAME` with your GitHub username after deploying)*

## 🎯 What It Does

- **Upload any text‑based PDF** (lecture slides, notes, textbooks)
- **Extracts text locally** using `pdf.js` – your files never leave your browser
- **Sends the text to Groq’s Llama 3.3 70B** (free tier: 14,400 requests/day)
- **Generates**:
  - A **5‑point summary** focused on exam‑likely concepts
  - **5 Q&A flashcards** designed for active recall
  - A short **topic name** for easy organisation

## 🚀 Why Use This Instead of ChatGPT/Claude?

| Feature | This Tool | ChatGPT / Claude |
|---------|-----------|------------------|
| **Cost** | ✅ Completely free | ❌ Subscription or pay‑per‑token |
| **Privacy** | ✅ PDF stays in your browser | ❌ Uploaded to external servers |
| **Speed** | ✅ ~1–2 seconds per PDF | ❌ Slower, variable |
| **Daily limit** | ✅ 14,400 requests (more than enough) | ❌ Low free tiers |
| **Exam focus** | ✅ Built‑in prompt engineering | ❌ Requires manual prompting |

## 🛠️ How to Use

1. **Get a free Groq API key** (no credit card):
   - Go to [console.groq.com](https://console.groq.com)
   - Sign up with Google/GitHub/email
   - Navigate to **API Keys** → **Create API Key**
   - Copy the key (starts with `gsk_`)

2. **Open the hosted site** (link above) or run locally.

3. **Paste your API key** into the input field.

4. **Drag & drop your PDFs** (or click to browse).  
   - Max file size: **25 MB**  
   - Works best with **text‑based PDFs** (not scanned images)

5. Click **"Process all PDFs (FREE)"**.

6. Review the **exam‑focused summary** and **flashcards**.  
   - Click on any result to expand/collapse.  
   - Use the **"Copy /flashcard commands"** button to export to Anki or other flashcard apps.

## ⚙️ Advanced Safeguards (Built‑in)

- **Daily request counter** – persists across page refreshes (stored in `localStorage`)
- **Exponential backoff** – automatically retries if Groq rate‑limits (429)
- **Scanned PDF detection** – warns you if the PDF appears to be an image with no selectable text
- **File size limit** – rejects PDFs > 25 MB to keep the browser responsive
- **Configurable delay** – add time between calls to avoid hitting per‑minute limits
- **Max files per batch** – process only a subset of your queue

## 📂 Project Structure

```
lecture-processor/
├── index.html          # Main UI (modal, drag zone, stats)
├── css/
│   └── styles.css      # Dark theme, responsive layout, modal styles
└── js/
    └── script.js       # All logic: PDF extraction, Groq API, rate limiting, UI
```

## 🔧 Running Locally (for Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/Amika1118/lecture-processor.git
   cd lecture-processor
   ```
2. Serve with any static server. Example using Python:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

## ☁️ Deploy to GitHub Pages

1. Push the repository to GitHub.
2. Go to **Settings** → **Pages**.
3. Under **Branch**, select `main` and `/ (root)`.
4. Click **Save**.
5. After 1–2 minutes, your site is live at:  
   `https://YOUR_USERNAME.github.io/lecture-processor/`

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Could not extract enough text"** | Your PDF is likely a scanned image. Use OCR software (e.g., Adobe Acrobat, Tesseract) to convert to text‑based PDF. |
| **"Daily request limit reached"** | Wait until tomorrow (the counter resets at midnight based on your browser’s clock). You can also increase the limit in the advanced settings (but respect Groq’s 14,400/day cap). |
| **"Rate limit (429)"** | The tool will automatically retry up to 3 times with exponential backoff. If it persists, reduce the number of files or increase the delay between calls. |
| **File upload fails** | Check file size (<25 MB) and type (must be `.pdf`). |
| **Nothing happens after clicking Process** | Make sure you entered a valid Groq API key and that your PDF contains selectable text. |

## 🙏 Acknowledgements

- [Groq](https://groq.com) for the insanely fast, free Llama 3.3 70B API.
- [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) for client‑side PDF text extraction.
- [IBM Plex](https://fonts.google.com/specimen/IBM+Plex+Mono) for the clean monospace font.

## 📄 License

MIT – free for personal and educational use.

---

**Built with ❤️ for students who want to study smarter, not harder.**
```