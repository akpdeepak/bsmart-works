import { useMemo, useState } from 'react';
import { Activity, GitBranch, Languages, MessageSquare, Search, TrendingUp } from 'lucide-react';
import {
  articlePlainText,
  contentGapAnalysis,
  duplicateCandidates,
  healthScore,
  knowledgeGraph,
  translateArticleText,
  trendingArticles,
} from '@/lib/knowledge-roadmap-tools';

function PanelSection({ title, icon: Icon, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 text-brand-navy" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function KnowledgeRoadmapPanel({
  article,
  articles = [],
  related = [],
  comments = [],
  searchQuery = '',
  onOpenArticle,
}) {
  const [savedSearches, setSavedSearches] = useState([]);
  const [language, setLanguage] = useState('Hindi');
  const [translation, setTranslation] = useState('');
  const text = articlePlainText(article);
  const health = useMemo(() => healthScore(article, related, comments), [article, related, comments]);
  const gaps = useMemo(() => contentGapAnalysis(article, related), [article, related]);
  const duplicates = useMemo(() => duplicateCandidates(article, articles), [article, articles]);
  const graph = useMemo(() => knowledgeGraph(article, articles, related), [article, articles, related]);
  const trending = useMemo(() => trendingArticles(articles), [articles]);

  if (!article) return null;

  const saveSearch = () => {
    const query = searchQuery.trim();
    if (!query || savedSearches.some((item) => item.query === query)) return;
    setSavedSearches((items) => [...items, { id: `${Date.now()}`, query }]);
  };

  const currentUrl = typeof window === 'undefined' ? '' : window.location?.href || '';
  const slackText = `${article.title || 'Article'}\n${currentUrl}`;

  return (
    <aside
      aria-label="Knowledge health dashboard"
      className="w-72 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 overflow-y-auto space-y-5"
    >
      <PanelSection title="Health" icon={Activity}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full border-4 border-brand-navy/20 flex items-center justify-center text-sm font-bold text-brand-navy">
            {health.score}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Knowledge health score</p>
            <p className="text-xs text-neutral-500">{health.reasons.length ? health.reasons.join(', ') : 'Healthy article'}</p>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Gaps" icon={Search}>
        <div className="space-y-1">
          {(gaps.missing.length ? gaps.missing : ['No obvious gaps']).map((gap) => (
            <p key={gap} className="text-xs rounded bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-neutral-700 dark:text-neutral-300">{gap}</p>
          ))}
          {gaps.nearbyTopics.length > 0 && (
            <p className="text-xs text-neutral-500">Nearby topics: {gaps.nearbyTopics.join(', ')}</p>
          )}
        </div>
      </PanelSection>

      <PanelSection title="Duplicates" icon={GitBranch}>
        {duplicates.length === 0 ? (
          <p className="text-xs text-neutral-500">No similar article candidates found.</p>
        ) : (
          <div className="space-y-1">
            {duplicates.map(({ article: item, score }) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenArticle?.(item.id)}
                className="w-full text-left rounded border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 hover:border-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              >
                <span className="block truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</span>
                <span className="text-2xs text-neutral-500">{score}% similar</span>
              </button>
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Graph" icon={GitBranch}>
        <div className="space-y-1">
          {graph.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => node.kind !== 'current' && onOpenArticle?.(node.id)}
              disabled={node.kind === 'current'}
              className="w-full flex items-center gap-2 text-left text-xs disabled:opacity-70"
            >
              <span className={`h-2 w-2 rounded-full ${node.kind === 'current' ? 'bg-brand-navy' : node.kind === 'related' ? 'bg-semantic-success' : 'bg-brand-orange'}`} />
              <span className="truncate text-neutral-700 dark:text-neutral-300">{node.title}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Trending" icon={TrendingUp}>
        <div className="space-y-1">
          {trending.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpenArticle?.(item.id)} className="w-full text-left text-xs text-brand-navy hover:underline">
              {item.title || item.id}
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Saved Searches" icon={Search}>
        <button type="button" onClick={saveSearch} disabled={!searchQuery.trim()} className="text-xs text-brand-navy hover:underline disabled:opacity-40">
          Save current search
        </button>
        <div className="space-y-1">
          {savedSearches.map((item) => (
            <p key={item.id} className="text-xs rounded bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-neutral-700 dark:text-neutral-300">{item.query}</p>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Translate" icon={Languages}>
        <div className="flex gap-1.5">
          <select aria-label="Translation language" value={language} onChange={(e) => setLanguage(e.target.value)} className="min-w-0 flex-1 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-transparent px-2 py-1">
            {['Hindi', 'Kannada', 'Japanese', 'Arabic', 'French'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => setTranslation(translateArticleText(text, language))} className="text-xs rounded bg-brand-navy px-2 py-1 font-semibold text-white">
            Draft
          </button>
        </div>
        {translation && <textarea aria-label="Translation draft" readOnly value={translation} rows={4} className="w-full text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-neutral-700 dark:text-neutral-300" />}
      </PanelSection>

      <PanelSection title="Slack" icon={MessageSquare}>
        <textarea aria-label="Slack share message" readOnly rows={3} value={slackText} className="w-full text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-neutral-700 dark:text-neutral-300" />
      </PanelSection>
    </aside>
  );
}
