/**
 * ui.js — UI-only enhancements
 * Handles: theme toggle, API key visibility, config panel, ARIA live updates
 * Core processing logic lives entirely in script.js — untouched.
 */

(function () {
  'use strict';

  // ── Theme toggle ────────────────────────────────────────────────────────────
  const root      = document.documentElement;
  const themeBtn  = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeBtn) {
      themeBtn.textContent        = theme === 'dark' ? '☀️' : '🌙';
      themeBtn.setAttribute('aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  const savedTheme = localStorage.getItem('uc-theme') || 'dark';
  applyTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('uc-theme', next);
    });
  }

  // ── Show / hide API key ─────────────────────────────────────────────────────
  const showKeyBtn = document.getElementById('show-key-btn');
  const keyInput   = document.getElementById('groq-key');

  if (showKeyBtn && keyInput) {
    showKeyBtn.addEventListener('click', () => {
      const isHidden = keyInput.type === 'password';
      keyInput.type  = isHidden ? 'text' : 'password';
      showKeyBtn.setAttribute('aria-pressed', String(isHidden));
      showKeyBtn.setAttribute('aria-label', isHidden ? 'Hide API key' : 'Show API key');
    });
  }

  // ── Config panel (overrides inline onclick in HTML) ─────────────────────────
  // script.js defines window.toggleConfig — we replace it here with an
  // accessible version that uses aria-expanded + hidden attribute.
  window.toggleConfig = function () {
    const body    = document.getElementById('config-body');
    const btn     = document.getElementById('config-toggle-btn');
    const chevron = document.getElementById('config-chevron');

    if (!body) return;

    const opening = body.hidden;
    body.hidden   = !opening;

    if (btn)     btn.setAttribute('aria-expanded', String(opening));
    if (chevron) chevron.classList.toggle('open', opening);
  };

  // ── ARIA: keep progress-bar aria-valuenow in sync ──────────────────────────
  const progressBar  = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');

  if (progressBar && progressFill) {
    const observer = new MutationObserver(() => {
      const pct = parseInt(progressFill.style.width, 10) || 0;
      progressBar.setAttribute('aria-valuenow', pct);
    });
    observer.observe(progressFill, { attributes: true, attributeFilter: ['style'] });
  }

  // ── Close modal on outside click ────────────────────────────────────────────
  // (Complements the modal event wiring already in script.js initModalEvents)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('key-instruction-modal');
    if (modal && modal.style.display === 'block') {
      modal.style.display = 'none';
    }
  });

})();