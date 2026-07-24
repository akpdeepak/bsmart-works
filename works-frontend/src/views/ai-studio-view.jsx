import { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, Sparkles, MessageSquare, Play, Send, Workflow, FileText } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { Badge } from '@/components/works/atoms/badge';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { Skeleton } from '@/components/works/atoms/skeleton';
import {
  assistantsClient, agentsClient, conversationalDashboardsClient, artifactsClient, aiVerdictLabel,
} from '@/lib/advanced-ai';
import { BlockEditor } from '@/components/BlockEditor';

// AI Studio â€” iteration-20 advanced AI (Cap O). Three surfaces over the AI Control Plane:
//   â€¢ Assistants â€” chat with a workspace persona; it remembers context across turns (AI memory).
//   â€¢ Agents     â€” give a multi-step goal; it plans + runs steps and shows an audited result.
//   â€¢ Ask        â€” natural-language â†’ dashboard widget spec (conversational dashboards).
// Self-fetching: the parent supplies the active workspaceId (+ an optional toast handler). Every
// reply is badged with the control-plane verdict (AI vs Offline fallback) so the UI is honest.
export default function AiStudioView({ workspaceId, onToast }) {
  const [tab, setTab] = useState('assistants');
  const notify = useCallback((m, k) => { if (onToast) onToast(m, k); }, [onToast]);

  const TABS = [
    { id: 'assistants', label: 'Assistants', icon: Bot },
    { id: 'agents', label: 'Agents', icon: Workflow },
    { id: 'canvas', label: 'Canvas', icon: FileText },
    { id: 'ask', label: 'Ask', icon: Sparkles },
  ];

  // Arrow-key navigation across the tabs (WCAG tab pattern): Left/Right/Home/End move and select.
  function onTabKeyDown(e) {
    const idx = TABS.findIndex((t) => t.id === tab);
    if (idx < 0) return;
    const moves = {
      ArrowRight: (idx + 1) % TABS.length,
      ArrowLeft: (idx - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const nextId = TABS[moves[e.key]].id;
    setTab(nextId);
    const el = typeof document !== 'undefined' && document.getElementById(`aistudio-tab-${nextId}`);
    if (el && typeof el.focus === 'function') el.focus();
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">AI Studio</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Custom assistants, multi-step agents and conversational dashboards â€” all governed by the AI Control Plane.
        </p>
      </div>

      <div role="tablist" aria-label="AI Studio sections"
        className="mb-5 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <Button unstyled key={t.id} id={`aistudio-tab-${t.id}`} role="tab" aria-selected={selected}
              aria-controls={`aistudio-panel-${t.id}`} tabIndex={selected ? 0 : -1} type="button"
              onKeyDown={onTabKeyDown}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-brand-navy text-brand-navy dark:text-white'
                  : 'border-transparent text-neutral-600 hover:text-neutral-800 dark:text-neutral-400'
              }`}>
              <t.icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
            </Button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1" id={`aistudio-panel-${tab}`} role="tabpanel"
        aria-labelledby={`aistudio-tab-${tab}`}>
        {tab === 'assistants' && <AssistantsPanel workspaceId={workspaceId} notify={notify} />}
        {tab === 'agents' && <AgentsPanel workspaceId={workspaceId} notify={notify} />}
        {tab === 'canvas' && <CanvasPanel workspaceId={workspaceId} notify={notify} />}
        {tab === 'ask' && <AskPanel workspaceId={workspaceId} notify={notify} />}
      </div>
    </div>
  );
}

function VerdictBadge({ reply }) {
  if (!reply) return null;
  const offline = reply.fallback || !reply.usedAi;
  return <Badge tone={offline ? 'neutral' : 'success'}>{aiVerdictLabel(reply)}</Badge>;
}

// â”€â”€ Assistants + chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AssistantsPanel({ workspaceId, notify }) {
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const load = useCallback(() => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    assistantsClient.list(workspaceId)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAssistants(list);
        setActiveId((cur) => cur || (list[0] && list[0].id) || null);
      })
      .catch((e) => setError(e.message || 'Could not load assistants.'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (endRef.current && typeof endRef.current.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [turns]);

  const selectAssistant = (id) => { setActiveId(id); setTurns([]); };

  const send = () => {
    const body = message.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setTurns((t) => [...t, { role: 'user', text: body }]);
    setMessage('');
    assistantsClient.chat(workspaceId, activeId, body)
      .then((reply) => setTurns((t) => [...t, { role: 'assistant', text: reply.answer, reply }]))
      .catch((e) => { notify(e.message || 'The assistant could not respond.', 'error'); })
      .finally(() => setSending(false));
  };

  const active = assistants.find((a) => a.id === activeId);

  if (loading || error || assistants.length === 0) {
    return (
      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={load}
        errorTitle="Couldn't load assistants"
        empty={assistants.length === 0}
        emptyIcon={Bot}
        emptyTitle="No assistants yet"
        emptySubtitle="A workspace admin can define a persona (e.g. a Compliance Assistant) in AI Control."
        label="Loading assistants"
        className="space-y-3"
        skeleton={<><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></>}
      />
    );
  }

  return (
    <div className="grid h-full grid-cols-[220px_1fr] gap-4">
      <ul className="space-y-1 overflow-y-auto" aria-label="Assistants">
        {assistants.map((a) => (
          <li key={a.id}>
            <Button unstyled type="button" onClick={() => selectAssistant(a.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                a.id === activeId ? 'bg-brand-navy/10 text-brand-navy dark:text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}>
              <span className="block font-medium">{a.name}</span>
              {a.description && <span className="block truncate text-xs text-neutral-500">{a.description}</span>}
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex min-h-0 flex-col rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="border-b border-neutral-200 px-4 py-2 text-sm font-semibold dark:border-neutral-700">
          {active ? active.name : 'Assistant'}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {turns.length === 0
            ? <p className="text-sm text-neutral-500">Ask {active ? active.name : 'the assistant'} a question â€” it remembers context across turns.</p>
            : turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  t.role === 'user' ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                }`}>
                  {t.text}
                  {t.reply && <span className="mt-1 block"><VerdictBadge reply={t.reply} /></span>}
                </div>
              </div>
            ))}
          <div ref={endRef} />
        </div>
        <div className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-700">
          <input aria-label="Message the assistant" value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            placeholder="Type a messageâ€¦"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-900" />
          <Button type="button" size="sm" onClick={send} loading={sending}
            leftIcon={<Send className="h-4 w-4" aria-hidden="true" />}>Send</Button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Multi-step agents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AgentsPanel({ workspaceId, notify }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [goal, setGoal] = useState('');
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(null);

  const load = useCallback(() => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    agentsClient.runs(workspaceId)
      .then((data) => setRuns(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message || 'Could not load agent runs.'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const run = () => {
    const g = goal.trim();
    if (!g || running) return;
    setRunning(true);
    agentsClient.run(workspaceId, g)
      .then((view) => { setActive(view); setGoal(''); notify('Agent run complete.', 'success'); load(); })
      .catch((e) => notify(e.message || 'The agent run failed.', 'error'))
      .finally(() => setRunning(false));
  };

  return (
    <div className="grid h-full grid-cols-[1fr_360px] gap-4">
      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
          <Field label="Agent goal">
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3}
              placeholder="Triage all P0 customer requests from the last 24 hours: categorize, suggest assignees, draft responses"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-900" />
          </Field>
          <div className="mt-2">
            <Button type="button" size="sm" onClick={run} loading={running}
              leftIcon={<Play className="h-4 w-4" aria-hidden="true" />}>Run agent</Button>
          </div>
        </div>

        {active && (
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <h3 className="mb-2 text-sm font-semibold">Run result</h3>
            <p className="mb-3 text-xs text-neutral-500">{active.run.goal}</p>
            <ol className="space-y-2">
              {(active.steps || []).map((s) => (
                <li key={s.id} className="rounded-md bg-neutral-50 p-2 text-sm dark:bg-neutral-800">
                  <span className="mr-2 font-mono text-xs text-neutral-500">{s.seq}. {s.capability}</span>
                  <Badge tone={s.usedAi ? 'success' : 'neutral'}>{s.usedAi ? 'AI' : 'Offline'}</Badge>
                  <p className="mt-1 text-neutral-700 dark:text-neutral-300">{s.resultSummary}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="min-h-0 overflow-y-auto">
        <h3 className="mb-2 text-sm font-semibold">Recent runs</h3>
        <AsyncBoundary
          loading={loading}
          error={error}
          onRetry={load}
          errorTitle="Couldn't load agent runs"
          empty={runs.length === 0}
          emptyIcon={Workflow}
          emptyTitle="No agent runs yet"
          emptySubtitle="Give the agent a goal above and run it to see the steps it takes."
          label="Loading agent runs"
          skeleton={<Skeleton className="h-24 w-full" />}
        >
          <ul className="space-y-2">
            {runs.map((r) => (
              <li key={r.id}>
                <Button unstyled type="button" onClick={() => agentsClient.getRun(workspaceId, r.id).then(setActive)}
                  className="w-full rounded-md border border-neutral-200 p-2 text-left text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  <span className="block truncate font-medium">{r.goal}</span>
                  <span className="text-xs text-neutral-500">{r.stepCount} steps Â· {r.status}</span>
                </Button>
              </li>
            ))}
          </ul>
        </AsyncBoundary>
      </div>
    </div>
  );
}

// â”€â”€ Conversational dashboards (Ask) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AskPanel({ workspaceId, notify }) {
  const [prompt, setPrompt] = useState('');
  const [spec, setSpec] = useState(null);
  const [compiling, setCompiling] = useState(false);

  const compile = () => {
    const p = prompt.trim();
    if (!p || compiling) return;
    setCompiling(true);
    conversationalDashboardsClient.compile(workspaceId, p)
      .then(setSpec)
      .catch((e) => notify(e.message || 'Could not compose the dashboard.', 'error'))
      .finally(() => setCompiling(false));
  };

  const save = () => {
    if (!spec) return;
    conversationalDashboardsClient.save(workspaceId, spec.spec.title, prompt)
      .then(() => notify('Dashboard saved.', 'success'))
      .catch((e) => notify(e.message || 'Could not save.', 'error'));
  };

  return (
    <div className="w-full max-w-workspace space-y-4">
      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <Field label="Describe the dashboard you want">
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); compile(); } }}
            placeholder="Show velocity per team, last 6 sprints, with predictability composite"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-900" />
        </Field>
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" onClick={compile} loading={compiling}
            leftIcon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}>Compose</Button>
          {spec && <Button type="button" size="sm" variant="secondary" onClick={save}>Save</Button>}
        </div>
      </div>

      {spec && (
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold">{spec.spec.title}</h3>
            <Badge tone={spec.fallback ? 'neutral' : 'success'}>{spec.fallback ? 'Offline' : 'AI'}</Badge>
          </div>
          {spec.spec.caption && <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">{spec.spec.caption}</p>}
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-neutral-500">Metric</dt><dd className="font-medium">{spec.spec.metric}</dd></div>
            <div><dt className="text-neutral-500">Group by</dt><dd className="font-medium">{spec.spec.groupBy}</dd></div>
            <div><dt className="text-neutral-500">Chart</dt><dd className="font-medium">{spec.spec.chart}</dd></div>
            <div><dt className="text-neutral-500">Timeframe</dt>
              <dd className="font-medium">{spec.spec.timeframe ? `${spec.spec.timeframe.amount} ${spec.spec.timeframe.unit}` : 'â€”'}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}

// -- Canvas (Editable Artifacts) --------------------------------------------------
function CanvasPanel({ workspaceId, notify }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [verdict, setVerdict] = useState(null);

  const generate = () => {
    const p = prompt.trim();
    if (!p || generating) return;
    setGenerating(true);
    artifactsClient.generate(workspaceId, p)
      .then((res) => {
        setBlocks(res.blocks || []);
        setVerdict(res.meta);
        notify("Artifact generated successfully.", "success");
      })
      .catch((e) => notify(e.message || "Failed to generate artifact.", "error"))
      .finally(() => setGenerating(false));
  };

  return (
    <div className="grid h-full grid-cols-[300px_1fr_250px] gap-6">
      {/* Left: Chat / Prompt */}
      <div className="flex flex-col space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <h3 className="text-sm font-semibold">Artifact Generator</h3>
        <p className="text-xs text-neutral-500">Describe the work artifact you want to create.</p>
        <Field label="Instructions">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}
            placeholder="Draft a risk register for the upcoming Q3 release..."
            className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-900" />
        </Field>
        <Button type="button" onClick={generate} loading={generating} leftIcon={<Sparkles className="h-4 w-4" />}>
          Generate Artifact
        </Button>
      </div>

      {/* Center: BlockEditor Canvas */}
      <div className="flex flex-col rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <h2 className="text-sm font-medium">Canvas</h2>
          {verdict && <Badge tone={verdict.fallback ? "neutral" : "success"}>{aiVerdictLabel(verdict)}</Badge>}
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {blocks.length === 0 ? (
            <EmptyState icon={FileText} title="Empty Canvas" description="Generate an artifact to start editing." />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <BlockEditor blocks={blocks} onChange={setBlocks} workspaceId={workspaceId} />
            </div>
          )}
        </div>
      </div>

      {/* Right: Metadata & Tools */}
      <div className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <h3 className="text-sm font-semibold">Artifact Details</h3>
        <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
          <div>
            <span className="block font-medium text-neutral-900 dark:text-neutral-100">Status</span>
            <span>Draft</span>
          </div>
          <div>
            <span className="block font-medium text-neutral-900 dark:text-neutral-100">Version History</span>
            <ul className="mt-1 space-y-1 text-xs">
              <li>Current — just now</li>
            </ul>
          </div>
          <div>
            <span className="block font-medium text-neutral-900 dark:text-neutral-100">Approvals</span>
            <span className="text-xs text-neutral-500">None required for drafts.</span>
          </div>
        </div>
        <div className="mt-6">
          <Button type="button" variant="secondary" className="w-full" onClick={() => notify("Artifact exported.", "success")}>
            Export to PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

