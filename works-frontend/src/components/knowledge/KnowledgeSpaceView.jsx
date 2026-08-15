import { ArrowLeft, LayoutTemplate, File as FileIcon, BookOpen } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { FollowSpaceButton } from '@/components/knowledge/FollowSpaceButton';
import { BulkActionBar } from '@/components/knowledge/BulkActionBar';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { ArticleCard } from '@/components/knowledge/ArticleCard';

export function KnowledgeSpaceView({
  selectedSpace,
  knowledgeTab,
  setSelectedSpace,
  setKnowledgeTab,
  workspaceId,
  canManageProjects,
  deleteKnowledgeSpace,
  setTemplatePickerOpen,
  setIsArticleFormOpen,
  setArticleForm,
  selectedIds,
  handleBulkArchive,
  handleBulkDelete,
  clearSelection,
  bulkBusy,
  knowledgeArticlesLoading,
  knowledgeArticles,
  selectArticle,
  toggleSelect,
  bulkMode
}) {
  if (!selectedSpace && knowledgeTab !== 'all') {
    return (
      <EmptyState
        icon={BookOpen}
        title="Select a space"
        subtitle="Choose a knowledge space from the left sidebar to browse articles, or search for specific content."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {selectedSpace && (
            <Button unstyled
              onClick={() => { setSelectedSpace(null); setKnowledgeTab('spaces'); }}
              className="text-xs text-neutral-500 hover:text-brand-navy transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Spaces
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-brand-navy dark:text-white">
              {selectedSpace ? selectedSpace.name : 'All Articles'}
            </h1>
            {selectedSpace?.description && (
              <p className="text-xs text-neutral-500 mt-0.5">{selectedSpace.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedSpace && (
            <FollowSpaceButton
              spaceId={selectedSpace.id}
              workspaceId={workspaceId}
              initialFollowing={selectedSpace.following ?? false}
              initialCount={selectedSpace.followerCount ?? 0}
            />
          )}
          {selectedSpace && canManageProjects && (
            <Button unstyled
              onClick={() => deleteKnowledgeSpace(selectedSpace.id)}
              className="text-xs text-semantic-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded"
            >
              Delete Space
            </Button>
          )}
          {selectedSpace && (
            <>
              <Button
                variant="secondary"
                onClick={() => setTemplatePickerOpen(true)}
                className="flex items-center gap-1.5"
              >
                <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
                From template
              </Button>
              <Button
                variant="action"
                onClick={() => { setIsArticleFormOpen(true); setArticleForm({ title: '', content: '', templateType: 'KB', status: 'DRAFT' }); }}
              >
                + New Article
              </Button>
            </>
          )}
        </div>
      </div>

      <BulkActionBar
        selectedIds={selectedIds}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
        busy={bulkBusy}
      />

      {knowledgeArticlesLoading && knowledgeArticles.length === 0 ? (
        <AsyncBoundary
          loading
          label="Loading articles"
          className="space-y-2"
          skeleton={[0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-neutral-100 dark:bg-neutral-800" />)}
        />
      ) : knowledgeArticles.length === 0 ? (
        <AsyncBoundary
          empty
          emptyIcon={FileIcon}
          emptyTitle={selectedSpace ? `No articles in ${selectedSpace.name}` : 'No articles'}
          emptySubtitle="Create your first article to capture knowledge for the team."
          emptyAction={selectedSpace && (
            <Button variant="action" onClick={() => setIsArticleFormOpen(true)}>Write Article</Button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {knowledgeArticles.map(art => (
            <ArticleCard
              key={art.id}
              art={art}
              onClick={() => selectArticle(art)}
              selected={selectedIds.has(art.id)}
              onToggleSelect={toggleSelect}
              bulkMode={bulkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
