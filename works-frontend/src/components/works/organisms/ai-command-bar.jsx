// AI Command Bar (iteration 11, Cap P) — the conversational command bar.
// Type or speak a command in English / Hindi / Hinglish; the backend parses it into a multi-action
// plan; the user previews and edits each step, then confirms before anything runs (RB-40 §2
// confirm-before-execute pattern). The Works Orange AI button disappears entirely when the
// workspace has AI turned off (RB-30 / iteration-11 UX), and the panel also surfaces "what AI can
// do here" with each capability's deterministic fallback.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Mic, X, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/works/button';
import { aiClient, anyCapabilityEnabled, getSpeechRecognition } from '@/lib/ai';

const HINTS = [
  'Create a bug: portal login fails, priority High',
  'Bug WEB-1247 ko Rahul ko assign karo',
  'Find P0 bugs assigned to me and move them to In Progress',
  'Add comment on WEB-12: Starting work today',
];

export function AiCommandBar({ workspaceId, onToast, onExecuted, triggerCount, triggerQuery }) {
  const [capabilities, setCapabilities] = useState([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [plan, setPlan] = useState(null);          // { text, steps:[{action,description,params,_include}] }
  const [answer, setAnswer] = useState(null);      // { answer, sources, confidence }
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(0);
  const [listening, setListening] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const notify = useCallback((msg, type) => onToast?.(msg, type), [onToast]);

  useEffect(() => {
    let active = true;
    if (!workspaceId) return undefined;
    aiClient.capabilities(workspaceId)
      .then((caps) => { if (active) setCapabilities(caps); })
      .catch(() => { if (active) setCapabilities([]); });
    return () => { active = false; };
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (triggerCount > 0) {
      setOpen(true);
      if (triggerQuery) setText(triggerQuery);
    }
  }, [triggerCount, triggerQuery]);

  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 3500);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setPlan(null);
    setAnswer(null);
    setText('');
    if (recognitionRef.current) { recognitionRef.current.stop(); setListening(false); }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // AI is off for this workspace → the button disappears entirely (not just dims).
  if (!anyCapabilityEnabled(capabilities)) return null;

  const isQuestion = (str) => {
    const s = str.trim().toLowerCase();
    return s.endsWith('?') || /^(who|what|where|when|why|how|can|is|are|do|does|will|should|could|would)\b/.test(s);
  };

  const parse = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      if (isQuestion(text)) {
        const result = await aiClient.ask(workspaceId, text.trim());
        setAnswer(result);
        setPlan(null);
      } else {
        const result = await aiClient.parseCommand(workspaceId, text.trim());
        setPlan({ ...result, steps: (result.steps || []).map((s) => ({ ...s, _include: true })) });
        setAnswer(null);
      }
    } catch (e) {
      notify(e.message || 'Could not process request', 'error');
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    const steps = (plan?.steps || []).filter((s) => s._include);
    if (steps.length === 0) { notify('No steps selected', 'error'); return; }
    setBusy(true);
    try {
      const res = await aiClient.executePlan(workspaceId, steps);
      const ok = (res.results || []).filter((r) => r.ok).length;
      notify(`Ran ${ok}/${res.executed} step${res.executed === 1 ? '' : 's'}`, ok ? 'success' : 'error');
      onExecuted?.(res);
      close();
    } catch (e) {
      notify(e.message || 'Execution failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleVoice = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = getSpeechRecognition();
    if (!rec) { notify('Voice input is not supported in this browser', 'error'); return; }
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (ev) => setText(ev.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const editStep = (i, description) =>
    setPlan((p) => ({ ...p, steps: p.steps.map((s, idx) => (idx === i ? { ...s, description } : s)) }));
  const removeStep = (i) =>
    setPlan((p) => ({ ...p, steps: p.steps.filter((_, idx) => idx !== i) }));

  return (
    <>
      <Button
        variant="action"
        onClick={() => setOpen(true)}
        aria-label="Open AI command bar"
        className="gap-1.5"
      >
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        AI
      </Button>

      {open && (
        <div className="fixed inset-0 z-palette flex items-start justify-center bg-neutral-900/40 pt-24 px-4">
          <div
            role="dialog"
            aria-label="AI command bar"
            aria-modal="true"
            className="w-full max-w-3xl rounded-xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
          >
            {/* Command input */}
            <div className="flex items-center gap-2 p-4 border-b border-neutral-200 dark:border-neutral-700">
              <Sparkles aria-hidden="true" className="h-5 w-5 text-brand-orange shrink-0" />
              <label htmlFor="ai-command-input" className="sr-only">AI command</label>
              <input
                id="ai-command-input"
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') parse(); }}
                placeholder={HINTS[hint]}
                className="flex-1 bg-transparent text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={listening}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 ${listening ? 'bg-brand-orange text-white' : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              >
                <Mic aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Close AI command bar"
                className="w-9 h-9 rounded-md flex items-center justify-center text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
              {!plan && !answer && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600">
                    Type a command or ask a question — I&apos;ll preview the plan or find the answer.
                  </p>
                  <Button variant="action" onClick={parse} disabled={busy || !text.trim()}>
                    {busy ? 'Processing…' : 'Go'}
                  </Button>
                </div>
              )}

              {/* Answer Engine View (Epic 14) */}
              {answer && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100 font-medium">
                      {answer.answer}
                    </p>
                    {answer.confidence === 'HIGH' ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-green/20 text-brand-green uppercase tracking-wide shrink-0">High Confidence</span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-orange/20 text-brand-orange uppercase tracking-wide shrink-0">Low Confidence</span>
                    )}
                  </div>
                  {answer.sources && answer.sources.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Sources</p>
                      <ul className="space-y-1">
                        {answer.sources.map((s, i) => (
                          <li key={i} className="text-xs flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono">{s.id}</span>
                            <span className="text-neutral-700 dark:text-neutral-300">{s.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-end">
                    <Button variant="secondary" onClick={() => setAnswer(null)} disabled={busy}>Ask another</Button>
                  </div>
                </div>
              )}

              {/* Plan preview & inline edit (Cap P) */}
              {plan && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Here&apos;s what I&apos;ll do — review &amp; edit, then confirm
                  </p>
                  <ul className="space-y-2">
                    {plan.steps.map((step, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 p-2"
                      >
                        <input
                          type="checkbox"
                          checked={step._include}
                          onChange={() =>
                            setPlan((p) => ({
                              ...p,
                              steps: p.steps.map((s, idx) => (idx === i ? { ...s, _include: !s._include } : s)),
                            }))}
                          aria-label={`Include step ${i + 1}`}
                          className="accent-brand-navy"
                        />
                        <span className="text-xs font-mono text-neutral-400 w-28 shrink-0">{step.action}</span>
                        <label htmlFor={`ai-step-${i}`} className="sr-only">Step {i + 1} description</label>
                        <input
                          id={`ai-step-${i}`}
                          value={step.description}
                          onChange={(e) => editStep(i, e.target.value)}
                          className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 border-b border-transparent focus:border-neutral-300 focus-visible:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          aria-label={`Remove step ${i + 1}`}
                          className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="secondary" onClick={() => setPlan(null)} disabled={busy}>Edit command</Button>
                    <Button variant="action" onClick={run} disabled={busy} className="gap-1.5">
                      <Check aria-hidden="true" className="h-4 w-4" />
                      {busy ? 'Running…' : 'Confirm & run'}
                    </Button>
                  </div>
                </div>
              )}

              {/* What AI can do here + each capability's deterministic fallback */}
              <details className="rounded-md border border-neutral-200 dark:border-neutral-700">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  What AI can do here ({capabilities.filter((c) => c.enabled).length})
                </summary>
                <ul className="px-3 pb-3 space-y-2">
                  {capabilities.map((c) => (
                    <li key={c.id} className="text-sm">
                      <span className={c.enabled ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}>
                        {c.enabled ? '● ' : '○ '}{c.label}
                      </span>
                      <span className="block text-xs text-neutral-600">Fallback: {c.fallback}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
