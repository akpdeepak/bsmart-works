// Syntax-highlighted code block for read mode (BlockRenderer). Uses Shiki with the web bundle so
// the highlighter is loaded lazily once per page session and shared across all code blocks.
// Fallback: plain <pre><code> with the same monospace styling if Shiki hasn't initialised yet
// or if the language is not recognised. DOMPurify sanitises Shiki's HTML before innerHTML
// assignment (RB-10 §8 XSS prevention). KR-004 · P0 · RB-30 §1.

import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

// Language menu shown in BlockEditor edit mode (≈20 common languages + plaintext fallback).
export const CODE_LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'jsx', 'tsx',
  'java', 'python', 'sql', 'bash', 'shell',
  'json', 'yaml', 'xml', 'html', 'css',
  'go', 'rust', 'kotlin', 'swift', 'markdown',
  'dockerfile',
];

// Singleton promise so the highlighter is created only once for the lifetime of the page.
let highlighterPromise = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: CODE_LANGUAGES.filter((l) => l !== 'plaintext'),
      }),
    );
  }
  return highlighterPromise;
}

// DOMPURIFY config: allow the class / style attributes Shiki emits on span / code / pre elements.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['pre', 'code', 'span'],
  ALLOWED_ATTR: ['class', 'style', 'tabindex'],
};

/**
 * @param {{ content: string, language: string }} props
 */
export function CodeBlockRenderer({ content, language }) {
  const [html, setHtml] = useState(null);
  const lang = CODE_LANGUAGES.includes(language) ? language : 'plaintext';

  useEffect(() => {
    if (!content || lang === 'plaintext') { setHtml(null); return; }
    let cancelled = false;
    getHighlighter()
      .then((hl) => {
        if (cancelled) return;
        const isDark = document.documentElement.classList.contains('dark');
        const raw = hl.codeToHtml(content, { lang, theme: isDark ? 'github-dark' : 'github-light' });
        if (!cancelled) setHtml(DOMPurify.sanitize(raw, PURIFY_CONFIG));
      })
      .catch(() => { if (!cancelled) setHtml(null); });
    return () => { cancelled = true; };
  }, [content, lang]);

  if (html) {
    return (
      <div
        className="shiki-wrap rounded-md overflow-x-auto text-sm font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Plain fallback while Shiki loads or for plaintext.
  return (
    <pre className="rounded-md ring-1 ring-neutral-800 bg-neutral-900 p-3.5 text-sm font-mono text-neutral-100 overflow-x-auto whitespace-pre-wrap">
      {content}
    </pre>
  );
}
