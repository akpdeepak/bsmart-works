// MeetingNotesAssistant.jsx — AI-assisted meeting notes panel for MEETING_NOTES articles (KR-077).
//
// Accepts a raw transcript, calls the compose endpoint with mode="meeting_notes", and returns the
// structured blocks to the parent via onInsert(blocks). The backend applies the AI Control Plane
// (scope / budget / cache / audit) and a deterministic fallback (RB-40 §2), so the editor always
// gets usable structured notes — `meta.fallback` says whether AI actually ran.
//
// Props:
//   workspaceId  — string (required)
//   onInsert(blocks) — called with the parsed block array when generation succeeds
//
// Design tokens only (RB-30 §1). WCAG 2.1 AA accessible (RB-30 §6).

import { useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { knowledgeAi } from '@/lib/knowledge-ai';

const MAX_CHARS = 5000;

// Parse structured markdown into blocks for the block editor.
// Recognises:
//   # Heading  → heading1 block
//   - [ ] text → checklist block item (unchecked)
//   - text     → checklist block item (if inside an Action Items heading) or paragraph
//   _text_     → paragraph block (italicised notes)
//   plain line → paragraph block
//
// Groups consecutive list items under a single checklist or unordered block.
function markdownToBlocks(md) {
  const lines = (md || '').split('\n');
  const blocks = [];
  let id = 0;
  const uid = () => `meet-blk-${Date.now()}-${++id}`;

  let inActionItems = false;
  let checklistItems = [];
  let bulletItems = [];

  const flushChecklist = () => {
    if (checklistItems.length > 0) {
      blocks.push({
        id: uid(),
        type: 'checklist',
        content: '',
        metadata: { items: checklistItems.map(t => ({ text: t, done: false })) },
      });
      checklistItems = [];
    }
  };

  const flushBullets = () => {
    if (bulletItems.length > 0) {
      for (const t of bulletItems) {
        blocks.push({ id: uid(), type: 'paragraph', content: t, metadata: {} });
      }
      bulletItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Heading
    if (line.startsWith('# ')) {
      flushChecklist();
      flushBullets();
      const text = line.slice(2).trim();
      inActionItems = text.toLowerCase() === 'action items';
      blocks.push({ id: uid(), type: 'heading1', content: text, metadata: {} });
      continue;
    }

    // Unchecked checklist item from markdown
    if (line.startsWith('- [ ] ')) {
      flushBullets();
      checklistItems.push(line.slice(6).trim());
      continue;
    }

    // Bullet item — under Action Items heading → checklist; otherwise paragraph
    if (line.startsWith('- ')) {
      const text = line.slice(2).trim();
      if (inActionItems) {
        flushBullets();
        checklistItems.push(text);
      } else {
        flushChecklist();
        bulletItems.push(text);
      }
      continue;
    }

    // Blank line or italicised placeholder
    if (!line || line === '_No attendees detected._' || line === '_No key decisions detected._'
        || line === '_No action items detected._' || line === '_Add next steps here._') {
      flushChecklist();
      flushBullets();
      continue;
    }

    // Plain paragraph
    flushChecklist();
    flushBullets();
    blocks.push({ id: uid(), type: 'paragraph', content: line, metadata: {} });
  }

  flushChecklist();
  flushBullets();

  return blocks;
}

export function MeetingNotesAssistant({ workspaceId, onInsert }) {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastMeta, setLastMeta] = useState(null);

  const charCount = transcript.length;
  const overLimit = charCount > MAX_CHARS;
  const tooShort = transcript.trim().length < 10;

  const handleGenerate = async () => {
    if (tooShort || overLimit || loading) return;
    setLoading(true);
    setError(null);
    setLastMeta(null);
    try {
      const result = await knowledgeAi.compose(workspaceId, {
        mode: 'meeting_notes',
        text: transcript,
      });
      const blocks = markdownToBlocks(result.text);
      setLastMeta(result.meta || null);
      onInsert(blocks);
    } catch {
      setError('Could not generate notes. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl border border-brand-navy/20 bg-brand-navy/5 dark:bg-brand-navy/10 p-4 space-y-3"
      aria-label="Meeting notes assistant"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-navy flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold text-brand-navy dark:text-blue-300">
          Meeting Notes Assistant
        </span>
        <span className="text-xs text-neutral-500">
          Paste a transcript to generate structured notes
        </span>
      </div>

      <div>
        <label htmlFor="meeting-transcript" className="sr-only">
          Paste meeting transcript
        </label>
        <textarea
          id="meeting-transcript"
          rows={6}
          value={transcript}
          onChange={e => { setTranscript(e.target.value); setError(null); }}
          placeholder="Paste your meeting transcript here…&#10;Tip: @mentions become attendees, lines starting with 'Action:' become action items."
          aria-describedby="transcript-char-count"
          className="input resize-none text-sm w-full font-mono"
        />
        <div
          id="transcript-char-count"
          className={`text-xs mt-0.5 text-right ${overLimit ? 'text-semantic-danger font-semibold' : 'text-neutral-400'}`}
          aria-live="polite"
        >
          {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 text-xs text-semantic-danger rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 px-3 py-2"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="action"
          onClick={handleGenerate}
          disabled={tooShort || overLimit || loading}
          aria-busy={loading}
        >
          {loading ? 'Generating…' : 'Generate notes'}
        </Button>

        {lastMeta && (
          <AiMetaBadge meta={lastMeta} />
        )}
      </div>
    </div>
  );
}
