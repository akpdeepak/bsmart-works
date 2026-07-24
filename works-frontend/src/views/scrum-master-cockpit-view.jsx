import { useEffect, useState } from 'react';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/works/button';
import { useI18n } from '@/lib/i18n';
import { ListSkeleton } from '@/components/works/atoms/skeleton';
import { PageLayout } from '@/components/works/templates/page-layout';
import {
  CEREMONY_LABELS, ROLE_TABS, RUN_TABS, INSIGHTS_TABS,
  TIP_TONE, RAG_TONE, RAG_DOT,
} from './scrum-cockpit/_shared';
import { HealthTab } from './scrum-cockpit/health-tab';
import { MyDayTab } from './scrum-cockpit/myday-tab';
import { CeremoniesTab } from './scrum-cockpit/ceremonies-tab';
import { ImpedimentsTab } from './scrum-cockpit/impediments-tab';
import { StandupTab } from './scrum-cockpit/standup-tab';
import { RiskTab } from './scrum-cockpit/risk-tab';
import { VarianceTab } from './scrum-cockpit/variance-tab';
import { PlanningTab } from './scrum-cockpit/planning-tab';
import { CapacityTab } from './scrum-cockpit/capacity-tab';
import { RetroTab } from './scrum-cockpit/retro-tab';
import { ReviewTab } from './scrum-cockpit/review-tab';
import { PatternsTab } from './scrum-cockpit/patterns-tab';

// Sprint Cockpit — extracted from the App.jsx monolith (Wave 3); now role-adaptive, and split
// into one component per tab (this file is the thin tab-router shell). The parent owns all state
// and handlers; this renders the tabbed cockpit.
export default function ScrumMasterCockpitView({
  loading = false,
  i15ProjectId, projects, smTab, impediments, newImpediment, activeStandup, standups,
  standupDraft, sprints, riskSprintId, riskPanel, planningTimeOff, planningResult,
  retros, activeRetro, newRetro, retroNoteDraft, reviewSprintId, reviewResult, patternsResult,
  users, aiCapabilities, aiLoading, activeWorkspaceId,
  cockpitContext, ceremonies, activeCeremony, newCeremony, currentUserId,
  myDay, fetchMyDay, submitMyStandup,
  coachTips, fetchCoachTips, retroClusters, clusterRetro,
  cockpitLoading = {}, resetCockpitAnalysis, digest, fetchDigest,
  fetchCockpitContext, fetchCeremonies, scheduleCeremony, openCeremony, setActiveCeremony,
  setNewCeremony, startCeremony, joinCeremony, excuseCeremony, completeCeremony,
  setI15ProjectId, fetchImpediments, fetchStandups, fetchRetros, fetchSprints, setSmTab,
  updateImpediment, setNewImpediment, createImpediment,
  startStandup, openStandup, setActiveStandup, advanceStandup, completeStandup,
  setStandupDraft, recordStandup,
  setRiskSprintId, runRiskPanel,
  varianceSprintId, setVarianceSprintId, varianceResult, runVariance,
  setPlanningTimeOff, runSprintPlanning,
  capacityBoard, fetchCapacity, saveMemberCapacity,
  setActiveRetro, openRetro, setNewRetro, createRetro,
  addRetroNote, setRetroNoteDraft, voteRetroNote, convertRetroNote,
  setReviewSprintId, runReviewPrep, runPatterns,
  showToast, aiAction,
}) {
  const { t } = useI18n();
  const [tabTouched, setTabTouched] = useState(false); // has the user picked a tab this session?
  const roleKey = cockpitContext?.roleKey || 'scrum-master';
  // Until the context loads, keep the classic full cockpit — the server gates every action anyway.
  const canManage = cockpitContext ? !!cockpitContext.canManageSprints : true;
  const visibleTabs = ROLE_TABS[roleKey] || ROLE_TABS['scrum-master'];
  const liveCeremony = (ceremonies || []).find(c => c.session?.status === 'LIVE');

  // PR-D — two-mode IA. Split the role's tabs into "Run" (do the work) and "Insights" (analyse);
  // a segmented control swaps which set shows (only when the role has both).
  const runTabs = visibleTabs.filter(t => RUN_TABS.includes(t));
  const insightsTabs = visibleTabs.filter(t => INSIGHTS_TABS.includes(t));
  const hasBothModes = runTabs.length > 0 && insightsTabs.length > 0;

  // Phase-aware default: until the user touches a tab this session, land on the live ceremony
  // (standup if that's what's live, else the Ceremonies tab) or the role's first tab. Once the
  // user picks a tab, their choice sticks and a newly-live ceremony won't yank them away.
  const ceremonyTab = liveCeremony
    ? (liveCeremony.session.ceremonyType === 'STANDUP' && visibleTabs.includes('standup') ? 'standup'
       : visibleTabs.includes('ceremonies') ? 'ceremonies' : null)
    : null;
  const defaultTab = ceremonyTab || visibleTabs[0];
  const tab = (tabTouched && visibleTabs.includes(smTab)) ? smTab : defaultTab;
  const mode = INSIGHTS_TABS.includes(tab) ? 'insights' : 'run';
  const shownTabs = mode === 'insights' ? insightsTabs : runTabs;
  const selectTab = (k) => { setTabTouched(true); setSmTab(k); };

  // F1 — auto-load the active sprint when an analysis tab opens, so there's no
  // "select a sprint → click Analyze" step on the common path. The sprint selectors and
  // buttons stay for re-running or inspecting history. App.jsx clears results on project
  // change, so this re-fires per project.
  const activeSprintId = cockpitContext?.activeSprint?.id;
  useEffect(() => {
    if (tab === 'risk' && activeSprintId && !riskPanel && !cockpitLoading.risk) {
      runRiskPanel(activeSprintId);
    } else if (tab === 'variance' && activeSprintId && !varianceResult && !cockpitLoading.variance) {
      runVariance(activeSprintId);
    } else if (tab === 'review' && activeSprintId && !reviewResult && !cockpitLoading.review) {
      runReviewPrep(activeSprintId);
    } else if (tab === 'planning' && !planningResult && !cockpitLoading.planning) {
      runSprintPlanning();
    } else if (tab === 'capacity' && activeSprintId && !capacityBoard && !cockpitLoading.capacity) {
      fetchCapacity(activeSprintId);
    } else if (tab === 'patterns' && !patternsResult && !cockpitLoading.patterns) {
      runPatterns();
    }
    // fetch fns are stable refs (useCallback); cockpitLoading excluded to avoid re-trigger loop.
  }, [tab, activeSprintId, i15ProjectId]);

  // Reset the manual-touch flag on project switch so the phase-aware default applies afresh.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTabTouched(false);
  }, [i15ProjectId]);

  if (loading && projects.length === 0 && sprints.length === 0) {
    return (
      <PageLayout header={null}>
        <AsyncBoundary loading label="Loading cockpit" skeleton={<ListSkeleton rows={4} />} />
      </PageLayout>
    );
  }
  return (
    <PageLayout header={null} className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-brand-navy dark:text-white">{t('deliver.cockpit.title')}</h1>
            <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-brand-navy/10 text-brand-navy dark:bg-neutral-700 dark:text-neutral-200">{t(`deliver.cockpit.role.${roleKey}`)}</span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t(`deliver.cockpit.roleDesc.${['developer', 'product-owner', 'executive'].includes(roleKey) ? roleKey : 'default'}`)}
          </p>
        </div>
        <select className="input text-sm py-1.5" value={i15ProjectId} aria-label="Project"
          onChange={e => { setI15ProjectId(e.target.value); resetCockpitAnalysis?.(); fetchCockpitContext(e.target.value); fetchCoachTips(e.target.value); fetchDigest(e.target.value); fetchCeremonies(e.target.value); fetchMyDay(e.target.value); fetchImpediments(e.target.value); fetchStandups(e.target.value); fetchRetros(e.target.value); fetchSprints(e.target.value); }}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* F3 — persistent sprint context bar: RAG, day X/Y, burndown sparkline, delivery, and the
          live-ceremony chip, shown on every tab so context never disappears (RB-30 context zone). */}
      {(digest || liveCeremony) && (
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5">
          {digest?.rag?.status && (
            <span className="flex items-center gap-1.5" title={(digest.rag.reasons || []).join(' · ')}>
              <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[digest.rag.status] || RAG_DOT.GREEN}`} aria-hidden="true" />
              <span className={`text-xs font-bold uppercase tracking-wide ${RAG_TONE[digest.rag.status] || RAG_TONE.GREEN}`}>{digest.rag.status}</span>
            </span>
          )}
          {digest?.sprint
            ? <span className="text-sm text-neutral-700 dark:text-neutral-200">{digest.sprint.name}{digest.sprintDayOf ? ` · day ${digest.sprintDayOf}/${digest.sprintDayTotal}` : ''}</span>
            : digest && <span className="text-sm text-neutral-500 dark:text-neutral-400">No active sprint</span>}
          {(digest?.burndown || []).length > 1 && (() => {
            const max = Math.max(1, ...digest.burndown.map(d => d.remaining));
            return (
              <span className="flex items-end gap-px h-5" title="Burndown — points remaining per day" aria-hidden="true">
                {digest.burndown.map((d, i) => (
                  <span key={i} className="w-1 bg-brand-navy/60 rounded-sm" style={{ height: `${Math.max(2, Math.round(d.remaining * 100 / max))}%` }} />
                ))}
              </span>
            );
          })()}
          {typeof digest?.deliveryRate === 'number' && digest?.sprint && (
            <span className="text-xs text-neutral-600 dark:text-neutral-400">{digest.deliveryRate}% delivered</span>
          )}
          {liveCeremony && (
            <span className="ml-auto flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-semantic-danger animate-pulse" aria-hidden="true" />
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{CEREMONY_LABELS[liveCeremony.session.ceremonyType] || liveCeremony.session.ceremonyType} live · {liveCeremony.counts?.joined ?? 0} joined</span>
              </span>
              <Button variant="action" onClick={() => joinCeremony(liveCeremony.session.id)}>Join</Button>
              <Button variant="secondary" onClick={() => { selectTab('ceremonies'); openCeremony(liveCeremony.session.id); }}>Open</Button>
            </span>
          )}
        </div>
      )}

      {coachTips && (coachTips.tips || []).length > 0 && (
        <div className="mb-5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-brand-navy dark:text-neutral-200" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Coach pro-tips</h3>
            {coachTips.meta?.fallback === false && <span className="text-xs text-neutral-600 dark:text-neutral-400">AI</span>}
          </div>
          {coachTips.narrative && coachTips.meta?.fallback === false && (
            <p className="text-sm text-neutral-700 dark:text-neutral-200 mb-2">{coachTips.narrative}</p>
          )}
          <ul className="space-y-1.5">
            {(coachTips.tips || []).map((t, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Lightbulb className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${TIP_TONE[t.tone] || TIP_TONE.info}`} aria-hidden="true" />
                <span className="text-sm text-neutral-800 dark:text-neutral-200">{t.text}</span>
                {t.action && visibleTabs.includes(t.action.tab) && (
                  <Button unstyled onClick={() => selectTab(t.action.tab)}
                    className="ml-1 flex-shrink-0 text-xs font-medium text-brand-navy hover:underline whitespace-nowrap">
                    {t.action.label} →
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mode bar: [Run | Insights] segments (when the role has both) + a global Raise. */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {hasBothModes ? (
          <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5" role="tablist" aria-label="Cockpit mode">
            {['run', 'insights'].map((m) => (
              <Button unstyled key={m} role="tab" aria-selected={mode === m}
                onClick={() => selectTab(m === 'insights' ? insightsTabs[0] : runTabs[0])}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${mode === m ? 'bg-brand-navy text-white' : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100'}`}>
                {t(`deliver.cockpit.mode.${m}`)}
              </Button>
            ))}
          </div>
        ) : <span />}
        {visibleTabs.includes('impediments') && cockpitContext?.canCreateItems && (
          <Button variant="action" onClick={() => selectTab('impediments')}>+ {t('deliver.cockpit.raise')}</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700 mb-5" role="tablist">
        {shownTabs.map(k => (
          <Button unstyled key={k} role="tab" aria-selected={tab === k} onClick={() => selectTab(k)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === k ? 'border-brand-navy text-brand-navy dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}`}>
            {t(`deliver.cockpit.tab.${k}`)}
          </Button>
        ))}
      </div>

      {tab === 'health' && <HealthTab digest={digest} />}

      {tab === 'myday' && (
        <MyDayTab
          myDay={myDay} standupDraft={standupDraft} setStandupDraft={setStandupDraft}
          submitMyStandup={submitMyStandup} selectTab={selectTab}
        />
      )}

      {tab === 'ceremonies' && (
        <CeremoniesTab
          ceremonies={ceremonies} activeCeremony={activeCeremony} canManage={canManage}
          newCeremony={newCeremony} setNewCeremony={setNewCeremony} scheduleCeremony={scheduleCeremony}
          openCeremony={openCeremony} setActiveCeremony={setActiveCeremony} startCeremony={startCeremony}
          joinCeremony={joinCeremony} completeCeremony={completeCeremony} excuseCeremony={excuseCeremony}
          users={users} currentUserId={currentUserId}
        />
      )}

      {tab === 'impediments' && (
        <ImpedimentsTab
          impediments={impediments} newImpediment={newImpediment} setNewImpediment={setNewImpediment}
          createImpediment={createImpediment} updateImpediment={updateImpediment} cockpitContext={cockpitContext}
        />
      )}

      {tab === 'standup' && (
        <StandupTab
          activeStandup={activeStandup} standups={standups} canManage={canManage}
          startStandup={startStandup} openStandup={openStandup} setActiveStandup={setActiveStandup}
          advanceStandup={advanceStandup} completeStandup={completeStandup} standupDraft={standupDraft}
          setStandupDraft={setStandupDraft} recordStandup={recordStandup} users={users}
          aiCapabilities={aiCapabilities} aiLoading={aiLoading} aiAction={aiAction}
          activeWorkspaceId={activeWorkspaceId} showToast={showToast}
        />
      )}

      {tab === 'risk' && (
        <RiskTab
          riskSprintId={riskSprintId} setRiskSprintId={setRiskSprintId} sprints={sprints}
          runRiskPanel={runRiskPanel} riskPanel={riskPanel} cockpitLoading={cockpitLoading}
        />
      )}

      {tab === 'variance' && (
        <VarianceTab
          varianceSprintId={varianceSprintId} setVarianceSprintId={setVarianceSprintId} sprints={sprints}
          runVariance={runVariance} varianceResult={varianceResult} cockpitLoading={cockpitLoading}
        />
      )}

      {tab === 'planning' && (
        <PlanningTab
          planningTimeOff={planningTimeOff} setPlanningTimeOff={setPlanningTimeOff}
          runSprintPlanning={runSprintPlanning} planningResult={planningResult}
          cockpitLoading={cockpitLoading}
        />
      )}

      {tab === 'capacity' && (
        <CapacityTab
          capacityBoard={capacityBoard}
          cockpitLoading={cockpitLoading}
          canManage={canManage}
          saveMemberCapacity={(userId, patch) => saveMemberCapacity(activeSprintId, userId, patch)}
        />
      )}

      {tab === 'retro' && (
        <RetroTab
          activeRetro={activeRetro} retros={retros} openRetro={openRetro} newRetro={newRetro}
          setNewRetro={setNewRetro} createRetro={createRetro} setActiveRetro={setActiveRetro}
          clusterRetro={clusterRetro} retroClusters={retroClusters} retroNoteDraft={retroNoteDraft}
          setRetroNoteDraft={setRetroNoteDraft} addRetroNote={addRetroNote} voteRetroNote={voteRetroNote}
          convertRetroNote={convertRetroNote}
        />
      )}

      {tab === 'review' && (
        <ReviewTab
          reviewSprintId={reviewSprintId} setReviewSprintId={setReviewSprintId} sprints={sprints}
          runReviewPrep={runReviewPrep} reviewResult={reviewResult} cockpitLoading={cockpitLoading}
        />
      )}

      {tab === 'patterns' && (
        <PatternsTab runPatterns={runPatterns} patternsResult={patternsResult} cockpitLoading={cockpitLoading} />
      )}
    </PageLayout>
  );
}
