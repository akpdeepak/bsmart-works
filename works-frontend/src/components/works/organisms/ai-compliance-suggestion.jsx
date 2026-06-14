import { useState } from 'react';
import { aiClient } from '@/lib/ai';
import { Button } from '@/components/works/button';

// B27 — AI-assisted compliance rule suggestion (extracted from App.jsx, TD-003 / ONE Function).
// Sends a natural-language prompt to the AI which returns suggested rules; the user can adopt one
// directly into the rule builder. Fallback: when AI is off or over budget, the component is not
// rendered (hidden by the parent), per the AI Control Plane fallback contract (RB-40 §2).
export function AiComplianceSuggestion({ workspaceId, onAdopt, onToast }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  function handleSuggest() {
    if (!prompt.trim()) return;
    setLoading(true);
    setSuggestions(null);
    aiClient.suggestComplianceRules(workspaceId, prompt.trim())
      .then(res => {
        const rules = res?.suggestions || res?.rules || [];
        setSuggestions(rules);
        setLoading(false);
        if (!rules.length) onToast('No rule suggestions returned — try a different prompt.', 'info');
        if (res?.meta?.fallback) onToast('AI rule suggestion used fallback (template match).', 'info');
      })
      .catch(() => { setLoading(false); onToast('AI rule suggestion failed. Please try again.', 'error'); });
  }

  return (
    <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5">
      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">✦ AI Rule Suggestions</h3>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
        Describe a compliance concern in plain language — AI will suggest a BQL rule to encode it.
        <span className="block mt-0.5 italic">Fallback: seeded templates below when AI is off.</span>
      </p>
      <div className="flex gap-2">
        <input
          id="ai-compliance-prompt"
          className="input flex-1 text-sm"
          placeholder="e.g. Incidents should be assigned within 2 hours of creation"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSuggest(); }}
          aria-label="Describe the compliance rule you need"
        />
        <Button variant="secondary" disabled={loading || !prompt.trim()} onClick={handleSuggest}>
          {loading ? 'Thinking…' : 'Suggest'}
        </Button>
      </div>
      {loading && (
        <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading suggestions">
          <div className="animate-pulse h-10 bg-neutral-100 dark:bg-neutral-700 rounded" aria-hidden="true" />
          <div className="animate-pulse h-10 bg-neutral-100 dark:bg-neutral-700 rounded" aria-hidden="true" />
        </div>
      )}
      {suggestions && suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-3 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{s.name || `Rule ${i + 1}`}</p>
                {s.description && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{s.description}</p>}
                {s.scopeBql && <p className="text-xs font-mono text-brand-navy mt-1 truncate">{s.scopeBql} ⟶ {s.assertionBql}</p>}
              </div>
              <Button variant="secondary" onClick={() => { onAdopt(s); onToast('Rule draft opened in the rule builder.'); }}>Adopt</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
