import fs from 'fs';

const filePath = 'works-frontend/src/views/knowledge-view.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add imports
content = content.replace(
  "import { ArticleCard } from '@/components/knowledge/ArticleCard';",
  "import { ArticleCard } from '@/components/knowledge/ArticleCard';\nimport { KnowledgeSpaceView } from '@/components/knowledge/KnowledgeSpaceView';\nimport { KnowledgeSearchView } from '@/components/knowledge/KnowledgeSearchView';"
);

// Replace Search View
const searchRegex = /\/\* ── Search results ── \*\/[\s\S]*?(?=\) : \(selectedSpace \|\| knowledgeTab === 'all'\) \? \()/;
content = content.replace(searchRegex, `/* ── Search results ── */
              <KnowledgeSearchView
                filteredSearchResults={filteredSearchResults}
                knowledgeSearch={knowledgeSearch}
                filtersOpen={filtersOpen}
                setFiltersOpen={setFiltersOpen}
                searchStatusFilter={searchStatusFilter}
                setSearchStatusFilter={setSearchStatusFilter}
                searchTypeFilter={searchTypeFilter}
                setSearchTypeFilter={setSearchTypeFilter}
                searchDateFilter={searchDateFilter}
                setSearchDateFilter={setSearchDateFilter}
                setKnowledgeTab={setKnowledgeTab}
                setKnowledgeSearch={setKnowledgeSearch}
                setAiAnswer={setAiAnswer}
                aiSearchBusy={aiSearchBusy}
                aiAnswer={aiAnswer}
                openArticleById={openArticleById}
                selectedIds={selectedIds}
                handleBulkArchive={handleBulkArchive}
                handleBulkDelete={handleBulkDelete}
                clearSelection={clearSelection}
                bulkBusy={bulkBusy}
                selectArticle={selectArticle}
                toggleSelect={toggleSelect}
                bulkMode={bulkMode}
                STATUS_FILTERS={STATUS_FILTERS}
                TEMPLATE_TYPES={TEMPLATE_TYPES}
              />
            `);

// Replace Space View
const spaceRegex = /\/\* ── Space \/ All Articles ── \*\/[\s\S]*?(?=\) : \(\s*<EmptyState)/;
content = content.replace(spaceRegex, `/* ── Space / All Articles ── */
              <KnowledgeSpaceView
                selectedSpace={selectedSpace}
                knowledgeTab={knowledgeTab}
                setSelectedSpace={setSelectedSpace}
                setKnowledgeTab={setKnowledgeTab}
                workspaceId={workspaceId}
                canManageProjects={can('manage_projects')}
                deleteKnowledgeSpace={deleteKnowledgeSpace}
                setTemplatePickerOpen={setTemplatePickerOpen}
                setIsArticleFormOpen={setIsArticleFormOpen}
                setArticleForm={setArticleForm}
                selectedIds={selectedIds}
                handleBulkArchive={handleBulkArchive}
                handleBulkDelete={handleBulkDelete}
                clearSelection={clearSelection}
                bulkBusy={bulkBusy}
                knowledgeArticlesLoading={knowledgeArticlesLoading}
                knowledgeArticles={knowledgeArticles}
                selectArticle={selectArticle}
                toggleSelect={toggleSelect}
                bulkMode={bulkMode}
              />
            `);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactoring complete');
