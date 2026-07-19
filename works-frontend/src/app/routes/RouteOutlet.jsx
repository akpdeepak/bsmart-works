import React from 'react';
import { CustomizationView } from '@/components/works/organisms/customization-view';
import { DeveloperWorkspace } from '@/components/works/organisms/developer-workspace';
import { SlaView } from '@/components/works/organisms/sla-view';
import { PerformancePanel } from '@/components/works/organisms/performance-panel';
import { AiSettingsPanel } from '@/components/works/organisms/ai-settings-panel';
import { AutomationsPanel } from '@/components/works/organisms/automations-panel';
import { IntegrationsPanel } from '@/components/works/organisms/integrations-panel';
import { SecurityCenter } from '@/components/works/organisms/security-center';
import { AiComplianceSuggestion } from '@/components/works/organisms/ai-compliance-suggestion';
import { SprintItemList } from '@/components/works/organisms/sprint-item-list';
import { Skeleton } from '@/components/works/atoms/skeleton';
import { onPressKey } from '@/lib/utils';
import { api } from '@/lib/apiClient';
import { anyCapabilityEnabled } from '@/lib/ai';
import {
  AccountView, AdminOpsView, AiStudioView, BacklogView, BoardView, BqlView,
  ComplianceView, DashboardView, DashboardsView, DeveloperPortalView,
  KnowledgeTemplatesView, KnowledgeView, LeadershipConsoleView, MarketplaceView,
  MyWorksView, NotificationsView, PmView, PoWorkspaceView, ProjectsView,
  ReleasesView, ReportBuilderView, ReportsView, ScrumMasterCockpitView, SearchView,
  ServiceView, Settings3View, SprintView, SupportInboxView, TrashView, WorkspaceView,
} from '@/app/routes';
export function RouteOutlet({ model }) {
  const { acceptDashboardSuggestion, actionItems, activeCeremony, activeObjective, activeRetro, activeSprint, activeStandup, activeWorkspaceId, actOnViolation, addArticleComment, addDashboardWidget, addItemToRelease, addKeyResult, addProjectMember, addReportSection, addRetroNote, addStatus, addTransition, adminDash, advanceStandup, aiAction, aiCapabilities, aiLoading, applyFilter, archiveArticle, articleAnalytics, articleChildren, articleComments, articlePanel, articleVersions, assignServiceRequest, assumptions, backlogItems, bqlError, bqlLoading, bqlQuery, bqlResults, brandingColor, brandingDesc, bulkAcknowledge, can, capacityBoard, cardPrefs, ceremonies, cloneTemplate, clusterFeedback, clusterRetro, coachTips, cockpitContext, cockpitLoading, columns, completeCeremony, completeStandup, complianceAudit, complianceDashboard, complianceRules, complianceTab, complianceTemplates, complianceViolations, convertRetroNote, createBlankReport, createCrossProjectDep, createDashboard, createFeedback, createFieldDef, createIdea, createImpediment, createObjective, createReportFromTemplate, createReportSchedule, createRetro, createRole, createServiceCustomer, createTheme, createWorkItemType, crossProjectDeps, crossProjForm, currentUser, customDashboards, customFieldDefs, dashboardAggregate, dashboardDrill, dashboardEditMode, dashboardRole, dashboardScope, dashboardTeamId, dashLoading, decisions, deleteArticle, deleteArticleComment, deleteDashboard, deleteKnowledgeSpace, deleteRelease, deleteReport, deleteReportSchedule, deleteRule, deleteStatus, deleteTheme, deleteTransition, density, dependencies, developerDash, digest, dragOverId, editingArticle, editRuleBuilder, evaluateRule, excuseCeremony, execDash, expandedWorkflowId, expandWorkflow, exportComplianceAudit, feedbackClusters, feedbackItems, fetchActionItems, fetchArticleChildren, fetchArticleDetail, fetchAssumptions, fetchBacklog, fetchCapacity, fetchCeremonies, fetchCoachTips, fetchCockpitContext, fetchComplianceAudit, fetchComplianceDashboard, fetchComplianceRules, fetchComplianceTemplates, fetchComplianceViolations, fetchCrossProjectDeps, fetchDashboard, fetchDashboardAggregate, fetchDecisions, fetchDependencies, fetchDigest, fetchFieldDefs, fetchFieldLayouts, fetchFieldVisibility, fetchImpediments, fetchKnowledgeArticles, fetchLessons, fetchMeetings, fetchMembers, fetchMyDay, fetchNotifications, fetchPermMatrix, fetchPmIssues, fetchProjectMembers, fetchRaidDashboard, fetchReleaseItems, fetchReleases, fetchRetros, fetchRisks, fetchRoles, fetchSavedFilters, fetchServiceCsat, fetchServiceCustomers, fetchServiceRequests, fetchServiceTiers, fetchServiceTypes, fetchSprintItems, fetchSprintMetrics, fetchSprintReport, fetchSprints, fetchStakeholders, fetchStandups, fetchUnreadCount, fetchWidgetData, fetchWorkflows, fetchWorkItemTypes, fieldDefs, fieldLayouts, fieldPrefs, fieldVisibility, formDesignerTypeId, handleArchiveProject, handleBacklogDragStart, handleBacklogDrop, handleBulkEdit, handleDelete, handleDragOver, handleDragStart, handleDrop, handleInlineCreate, handleInvite, handleMfaConfirm, handleMfaEnroll, handleMoveToBacklog, handleMoveToSprint, handleRefinementUpdate, handleRemoveMember, handleSaveFieldPrefs, handleSaveFilter, handleSprintStatusChange, i15ProjectId, ideas, impediments, inviteEmail, inviteMsg, isCrossProjOpen, joinCeremony, knowledgeArticles, knowledgeArticlesLoading, knowledgeSearch, knowledgeSearchResults, knowledgeSpaces, knowledgeSpacesLoading, knowledgeTab, lessonsLearned, loading, meetingNotes, meetings, mfaSetup, mfaSetupCode, mfaSetupMsg, mintShare, moveReportSection, myDay, myItems, myWorksTab, navigate, newArticleComment, newCeremony, newCustomer, newFeedback, newFieldForm, newFieldVisForm, newIdea, newImpediment, newKr, newObjective, newRetro, newRoleForm, newRuleBuilder, newStatusForm, newTheme, newTransitionForm, newTypeForm, notifications, notifPrefs, objectives, openArticlePanel, openCeremony, openDashboard, openObjective, openReport, openRetro, openScheduleManager, openStandup, patternsResult, permanentDelete, permMatrix, planningResult, planningTimeOff, pmCreate, pmDelete, pmForm, pmFormOpen, pmIssues, pmProjectId, pmTab, poDash, poTab, previewWidgetData, projectMemberEmail, projectMemberMsg, projectMembers, projectMetrics, projectMetricsLoading, projects, promoteIdea, publishArticle, raidDashboard, recordStandup, refinementMode, rejectArticle, releaseItems, releaseNotesName, releaseNotesResult, releases, releaseSearch, removeDashboardWidget, removeItemFromRelease, removeReportSection, reorderDashboardWidgets, reportEditMode, reports, reportSchedules, reportSections, reportTemplates, resetCockpitAnalysis, resetTodayLayout, resizeDashboardWidget, restoreArticle, restoreFromTrash, retroClusters, retroNoteDraft, retros, reviewResult, reviewSprintId, riskPanel, risks, riskSprintId, roadmapThemes, roles, ruleBuilder, ruleTestResult, runBql, runPatterns, runReleaseNotes, runReviewPrep, runRiskPanel, runSprintPlanning, runVariance, saveBranding, savedFilters, saveFieldVisibility, saveFilterName, saveMemberCapacity, saveNotifPrefs, saveReport, saveRule, saveTodayLayout, saveTodayTemplate, scheduleCeremony, scheduleForm, scheduleManagerOpen, scopeChanges, searchKnowledge, selectAllViolations, selectedArticle, selectedDashboard, selectedItem, selectedMeeting, selectedProjectId, selectedRelease, selectedReport, selectedSpace, selectedSprintId, selectedViolations, serviceCsat, serviceCustomers, serviceQueue, serviceRequests, serviceTab, serviceTiers, serviceTypes, setActiveCeremony, setActiveRetro, setActiveSprint, setActiveStandup, setArticleForm, setArticlePanel, setBqlQuery, setBrandingColor, setBrandingDesc, setComplianceTab, setCrossProjForm, setCustomFieldDefs, setDashboardDrill, setDashboardEditMode, setDashboardRole, setDashboardScope, setDashboardTeamId, setDensity, setDragOverId, setDragWidgetId, setEditingArticle, setExpandedWorkflowId, setFormDesignerTypeId, setI15ProjectId, setInviteEmail, setIsArticleFormOpen, setIsCreateOpen, setIsCrossProjOpen, setIsProjectOpen, setIsReleaseOpen, setIsSpaceFormOpen, setIsSprintOpen, setIsWorklogOpen, setKnowledgeSearch, setKnowledgeTab, setMeetingNotes, setMfaSetup, setMfaSetupCode, setMyWorksTab, setNewArticleComment, setNewCeremony, setNewCustomer, setNewFeedback, setNewFieldForm, setNewFieldVisForm, setNewIdea, setNewImpediment, setNewItem, setNewKr, setNewObjective, setNewRetro, setNewRoleForm, setNewStatusForm, setNewTheme, setNewTransitionForm, setNewTypeForm, setNotifications, setPlanningTimeOff, setPmForm, setPmFormOpen, setPmProjectId, setPmTab, setPoTab, setProjectMemberEmail, setRefinementMode, setReleaseNotesName, setReleaseSearch, setReportEditMode, setRetroNoteDraft, setReviewSprintId, setRiskSprintId, setRuleActive, setRuleBuilder, setSaveFilterName, setScheduleForm, setScheduleManagerOpen, setSelectedArticle, setSelectedDashboard, setSelectedItem, setSelectedMeeting, setSelectedRelease, setSelectedReport, setSelectedSpace, setSelectedSprintId, setServiceQueue, setServiceTab, setSettings3Tab, setShowFieldForm, setShowRoleForm, setShowSaveFilter, setShowTypeForm, setSmTab, setSprintFilters, setSprintItems, setSprintSort, setStandupDraft, setSwimlaneBy, settings3Tab, setUnreadCount, setVarianceSprintId, setView, setViolationFilter, setWipLimit, shareInfo, showFieldForm, showRoleForm, showSaveFilter, showToast, showTypeForm, smDash, smTab, sprintFilters, sprintItems, sprintMetrics, sprintMetricsLoading, sprintReport, sprints, sprintSort, stakeholders, standupDraft, standups, startCeremony, startStandup, statusResolver, stopShare, submitArticleForReview, submitMyStandup, swimlaneBy, teams, testRule, todayLayout, toggleArticleComment, togglePermission, toggleReportSchedule, toggleStar, toggleViolationSelect, totalWorkItemCount, transitionServiceRequest, trashItems, unreadCount, updateArticle, updateDashboardWidgetConfig, updateImpediment, updateKrProgress, updateRelease, updateReportSection, updateThemeStatus, userName, userRole, users, varianceResult, varianceSprintId, velocityData, view, violationFilter, voteIdea, voteRetroNote, widgetMetrics, wipLimits, workflowDetail, workflows, workItems, workItemTypes, workspaceMembers } = model;
  return (
          <React.Suspense fallback={
            <div aria-busy="true" aria-label="Loading view" className="p-6">
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          }>

          {/* ======================================================
               ITERATION 6 — ROLE-TUNED DASHBOARD
             ====================================================== */}
          {view === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              activeWorkspaceId={activeWorkspaceId}
              userRole={userRole}
              dashboardRole={dashboardRole}
              dashLoading={dashLoading}
              developerDash={developerDash}
              smDash={smDash}
              poDash={poDash}
              execDash={execDash}
              adminDash={adminDash}
              workItems={workItems}
              selectedItem={selectedItem}
              setIsCreateOpen={setIsCreateOpen}
              setDashboardRole={setDashboardRole}
              fetchDashboard={fetchDashboard}
              setView={setView}
              setSelectedItem={setSelectedItem}
              setIsWorklogOpen={setIsWorklogOpen}
              showToast={showToast}
              fetchBacklog={fetchBacklog}
              fetchSprints={fetchSprints}
              fetchMembers={fetchMembers}
              todayLayout={todayLayout}
              saveTodayLayout={saveTodayLayout}
              resetTodayLayout={resetTodayLayout}
              saveTodayTemplate={saveTodayTemplate}
              fetchWidgetData={fetchWidgetData}
              previewWidgetData={previewWidgetData}
              widgetMetrics={widgetMetrics}
            />
          )}

          {/* MY WORKS */}
          {view === 'myworks' && (
            <MyWorksView
              loading={loading}
              myItems={myItems}
              workItems={workItems}
              notifications={notifications}
              myWorksTab={myWorksTab}
              currentUser={currentUser}
              setMyWorksTab={setMyWorksTab}
              setSelectedItem={setSelectedItem}
              setIsCreateOpen={setIsCreateOpen}
              setView={setView}
              onPressKey={onPressKey}
              cardPrefs={cardPrefs}
              statusResolver={statusResolver}
            />
          )}

          {/* BOARD — extracted to src/views/board-view.jsx (TD-003) */}
          {view === 'board' && (
            <BoardView
              workItems={workItems}
              loading={loading}
              density={density}
              wipLimits={wipLimits}
              setDensity={setDensity}
              setIsCreateOpen={setIsCreateOpen}
              setNewItem={setNewItem}
              setSelectedItem={setSelectedItem}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDelete={handleDelete}
              toggleStar={toggleStar}
              setWipLimit={setWipLimit}
              can={can}
              userName={userName}
              cardPrefs={cardPrefs}
              customFieldDefs={customFieldDefs}
              statusResolver={statusResolver}
              workspaceId={activeWorkspaceId}
              currentUserId={currentUser?.id}
              users={users}
              onBulkEdit={handleBulkEdit}
              onCustomFieldCreated={def => setCustomFieldDefs(prev => [...prev, def])}
              totalWorkItemCount={totalWorkItemCount}
              columns={columns}
            />
          )}
          {/* PROJECTS */}
          {view === 'projects' && (
            <ProjectsView
              loading={loading}
              projects={projects}
              workItems={workItems}
              setIsProjectOpen={setIsProjectOpen}
              handleArchiveProject={handleArchiveProject}
              userName={userName}
              projectMetrics={projectMetrics}
              projectMetricsLoading={projectMetricsLoading}
              statusResolver={statusResolver}
            />
          )}

          {/* NOTIFICATIONS */}
          {view === 'developer' && (
            <DeveloperWorkspace
              workspaceId={activeWorkspaceId}
              onToast={showToast}
              onOpenItem={(id) => api.raw(`/work-items/${id}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((it) => { if (it) setSelectedItem(it); })
                .catch(reportError)}
            />
          )}

          {view === 'aistudio' && (
            <AiStudioView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'marketplace' && (
            <MarketplaceView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'developerportal' && (
            <DeveloperPortalView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'knowledgeadvanced' && (
            <KnowledgeTemplatesView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'supportinbox' && (
            <SupportInboxView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {/* ITERATION 16 — Leadership Console (Cap X) + Admin Operations Center (Cap Y).
              Both are self-contained surfaces that fetch their own workspace-scoped, RBAC-gated
              data via their lib clients → apiClient, like the Developer Workspace. */}
          {view === 'leadership' && (
            <LeadershipConsoleView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'adminops' && (
            <AdminOpsView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'notifications' && (
            <NotificationsView
              loading={loading}
              notifications={notifications}
              setNotifications={setNotifications}
              unreadCount={unreadCount}
              currentUser={currentUser}
              fetchNotifications={fetchNotifications}
              fetchUnreadCount={fetchUnreadCount}
              setUnreadCount={setUnreadCount}
              setView={setView}
              onError={reportError}
            />
          )}

          {/* BACKLOG VIEW — extracted to src/views/backlog-view.jsx (TD-003) */}
          {view === 'backlog' && (
            <BacklogView
              loading={loading}
              workItems={workItems}
              backlogItems={backlogItems}
              sprints={sprints}
              users={users}
              refinementMode={refinementMode}
              dragOverId={dragOverId}
              setRefinementMode={setRefinementMode}
              setDragOverId={setDragOverId}
              setIsCreateOpen={setIsCreateOpen}
              setIsSprintOpen={setIsSprintOpen}
              setSelectedItem={setSelectedItem}
              handleBacklogDragStart={handleBacklogDragStart}
              handleBacklogDrop={handleBacklogDrop}
              handleMoveToSprint={handleMoveToSprint}
              handleMoveToBacklog={handleMoveToBacklog}
              handleSprintStatusChange={handleSprintStatusChange}
              handleRefinementUpdate={handleRefinementUpdate}
              SprintItemList={SprintItemList}
              cardPrefs={cardPrefs}
              customFieldDefs={customFieldDefs}
              statusResolver={statusResolver}
              currentUserId={currentUser?.id}
              onInlineCreate={handleInlineCreate}
            />
          )}

          {/* ACTIVE SPRINT VIEW — extracted to src/views/sprint-view.jsx (TD-003) */}
          {view === 'sprint' && (
            <SprintView
              loading={loading}
              activeSprint={activeSprint}
              sprints={sprints}
              sprintItems={sprintItems}
              sprintMetrics={sprintMetrics}
              sprintMetricsLoading={sprintMetricsLoading}
              swimlaneBy={swimlaneBy}
              sprintFilters={sprintFilters}
              sprintSort={sprintSort}
              savedFilters={savedFilters}
              showSaveFilter={showSaveFilter}
              saveFilterName={saveFilterName}
              density={density}
              workItems={workItems}
              users={users}
              columns={columns}
              currentUser={currentUser}
              setActiveSprint={setActiveSprint}
              setSwimlaneBy={setSwimlaneBy}
              setSprintFilters={setSprintFilters}
              setSprintSort={setSprintSort}
              setShowSaveFilter={setShowSaveFilter}
              setSaveFilterName={setSaveFilterName}
              setSprintItems={setSprintItems}
              setSelectedItem={setSelectedItem}
              setView={setView}
              fetchSprintItems={fetchSprintItems}
              fetchSprintMetrics={fetchSprintMetrics}
              fetchBacklog={fetchBacklog}
              fetchSprints={fetchSprints}
              fetchSavedFilters={fetchSavedFilters}
              handleSaveFilter={handleSaveFilter}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDelete={handleDelete}
              applyFilter={applyFilter}
              showToast={showToast}
              reportError={reportError}
              selectedProjectId={selectedProjectId}
              cardPrefs={cardPrefs}
              customFieldDefs={customFieldDefs}
              statusResolver={statusResolver}
            />
          )}

          {/* REPORTS VIEW */}
          {view === 'reports' && (
            <ReportsView
              loading={loading}
              velocityData={velocityData}
              sprints={sprints}
              selectedSprintId={selectedSprintId}
              sprintReport={sprintReport}
              scopeChanges={scopeChanges}
              activeWorkspaceId={activeWorkspaceId}
              setSelectedSprintId={setSelectedSprintId}
              fetchSprintReport={fetchSprintReport}
            />
          )}

          {/* MY ACCOUNT — tier VIEWER+; personal settings reachable by all members */}
          {view === 'account' && (
            <AccountView
              currentUser={currentUser}
              notifPrefs={notifPrefs}
              mfaSetup={mfaSetup}
              mfaSetupCode={mfaSetupCode}
              mfaSetupMsg={mfaSetupMsg}
              setMfaSetup={setMfaSetup}
              setMfaSetupCode={setMfaSetupCode}
              saveNotifPrefs={saveNotifPrefs}
              handleMfaEnroll={handleMfaEnroll}
              handleMfaConfirm={handleMfaConfirm}
            />
          )}
          {/* WORKSPACE SETTINGS — tier ADMIN+ */}
          {view === 'workspace' && (
            <WorkspaceView
              activeWorkspaceId={activeWorkspaceId}
              workspaceMembers={workspaceMembers}
              currentUser={currentUser}
              userRole={userRole}
              inviteEmail={inviteEmail}
              inviteMsg={inviteMsg}
              brandingColor={brandingColor}
              brandingDesc={brandingDesc}
              projects={projects}
              selectedProjectId={selectedProjectId}
              projectMembers={projectMembers}
              projectMemberEmail={projectMemberEmail}
              projectMemberMsg={projectMemberMsg}
              setInviteEmail={setInviteEmail}
              setBrandingColor={setBrandingColor}
              setBrandingDesc={setBrandingDesc}
              setProjectMemberEmail={setProjectMemberEmail}
              handleRemoveMember={handleRemoveMember}
              handleInvite={handleInvite}
              saveBranding={saveBranding}
              fetchProjectMembers={fetchProjectMembers}
              addProjectMember={addProjectMember}
              can={can}
              showToast={showToast}
            />
          )}
          {/* ======================================================
               ITERATION 17 — UNIVERSAL CUSTOMIZATION ENGINE (Cap R)
             ====================================================== */}
          {view === 'customization' && (
            <CustomizationView
              workspaceId={activeWorkspaceId}
              canManage={can('manage_workspace')}
              isOwner={userRole.tier >= 5}
              onToast={showToast}
            />
          )}
          {/* ======================================================
               ITERATION 3 — WORKFLOWS & FIELDS SETTINGS
             ====================================================== */}
          {view === 'settings3' && (
            <Settings3View
              settings3Tab={settings3Tab}
              fieldPrefs={fieldPrefs}
              customFieldDefs={customFieldDefs}
              onSaveFieldPrefs={handleSaveFieldPrefs}
              workflows={workflows}
              expandedWorkflowId={expandedWorkflowId}
              workflowDetail={workflowDetail}
              newStatusForm={newStatusForm}
              newTransitionForm={newTransitionForm}
              fieldDefs={fieldDefs}
              showFieldForm={showFieldForm}
              newFieldForm={newFieldForm}
              fieldLayouts={fieldLayouts}
              fieldVisibility={fieldVisibility}
              newFieldVisForm={newFieldVisForm}
              roles={roles}
              permMatrix={permMatrix}
              showRoleForm={showRoleForm}
              newRoleForm={newRoleForm}
              workItemTypes={workItemTypes}
              showTypeForm={showTypeForm}
              newTypeForm={newTypeForm}
              activeWorkspaceId={activeWorkspaceId}
              setSettings3Tab={setSettings3Tab}
              setExpandedWorkflowId={setExpandedWorkflowId}
              setNewStatusForm={setNewStatusForm}
              setNewTransitionForm={setNewTransitionForm}
              setShowFieldForm={setShowFieldForm}
              setNewFieldForm={setNewFieldForm}
              setNewFieldVisForm={setNewFieldVisForm}
              setShowRoleForm={setShowRoleForm}
              setNewRoleForm={setNewRoleForm}
              setShowTypeForm={setShowTypeForm}
              setNewTypeForm={setNewTypeForm}
              fetchWorkflows={fetchWorkflows}
              fetchFieldDefs={fetchFieldDefs}
              fetchFieldLayouts={fetchFieldLayouts}
              fetchRoles={fetchRoles}
              fetchFieldVisibility={fetchFieldVisibility}
              fetchPermMatrix={fetchPermMatrix}
              fetchWorkItemTypes={fetchWorkItemTypes}
              expandWorkflow={expandWorkflow}
              addStatus={addStatus}
              deleteStatus={deleteStatus}
              addTransition={addTransition}
              deleteTransition={deleteTransition}
              createFieldDef={createFieldDef}
              saveFieldVisibility={saveFieldVisibility}
              togglePermission={togglePermission}
              createRole={createRole}
              createWorkItemType={createWorkItemType}
              reportError={reportError}
              showToast={showToast}
              api={api}
            />
          )}

          {/* ======================================================
               ITERATION 3 — BQL QUERY
             ====================================================== */}
          {view === 'bql' && (
            <BqlView
              bqlQuery={bqlQuery}
              bqlError={bqlError}
              bqlResults={bqlResults}
              workItems={workItems}
              activeWorkspaceId={activeWorkspaceId}
              aiCapabilities={aiCapabilities}
              nameMaps={{
                users: Object.fromEntries(users.map(u => [u.id, u.fullName || u.email])),
                projects: Object.fromEntries(projects.map(p => [p.id, p.name])),
                sprints: Object.fromEntries(sprints.map(s => [s.id, s.name])),
              }}
              setBqlQuery={setBqlQuery}
              setSelectedItem={setSelectedItem}
              runBql={runBql}
              notify={showToast}
              bqlLoading={bqlLoading}
            />
          )}

          {/* ======================================================
               ITERATION 4 — PM ARTIFACTS
             ====================================================== */}
          {view === 'pm' && (
            <PmView
              loading={loading}
              pmProjectId={pmProjectId}
              pmTab={pmTab}
              raidDashboard={raidDashboard}
              risks={risks}
              assumptions={assumptions}
              pmIssues={pmIssues}
              dependencies={dependencies}
              decisions={decisions}
              meetings={meetings}
              actionItems={actionItems}
              stakeholders={stakeholders}
              lessonsLearned={lessonsLearned}
              crossProjectDeps={crossProjectDeps}
              selectedMeeting={selectedMeeting}
              meetingNotes={meetingNotes}
              pmFormOpen={pmFormOpen}
              pmForm={pmForm}
              isCrossProjOpen={isCrossProjOpen}
              crossProjForm={crossProjForm}
              projects={projects}
              users={users}
              setPmProjectId={setPmProjectId}
              setPmTab={setPmTab}
              setSelectedMeeting={setSelectedMeeting}
              setMeetingNotes={setMeetingNotes}
              setPmFormOpen={setPmFormOpen}
              setPmForm={setPmForm}
              setIsCrossProjOpen={setIsCrossProjOpen}
              setCrossProjForm={setCrossProjForm}
              fetchRaidDashboard={fetchRaidDashboard}
              fetchRisks={fetchRisks}
              fetchAssumptions={fetchAssumptions}
              fetchPmIssues={fetchPmIssues}
              fetchDependencies={fetchDependencies}
              fetchDecisions={fetchDecisions}
              fetchMeetings={fetchMeetings}
              fetchActionItems={fetchActionItems}
              fetchStakeholders={fetchStakeholders}
              fetchLessons={fetchLessons}
              fetchCrossProjectDeps={fetchCrossProjectDeps}
              pmDelete={pmDelete}
              pmCreate={pmCreate}
              createCrossProjectDep={createCrossProjectDep}
              reportError={reportError}
              showToast={showToast}
              api={api}
            />
          )}

          {/* ITERATION 12 — Performance (KPI framework with privacy guardrails) */}
          {view === 'performance' && (
            <PerformancePanel
              workspaceId={activeWorkspaceId}
              aiCapabilities={aiCapabilities}
              onOpenItem={(id) => api.send(`/work-items/${encodeURIComponent(id)}`).then((it) => { if (it) setSelectedItem(it); }).catch(reportError)}
            />
          )}

          {/* ITERATION 11 — AI Control (AI Control Plane settings; mockup 09) */}
          {view === 'aicontrol' && (
            <AiSettingsPanel workspaceId={activeWorkspaceId} can={can} onToast={showToast} />
          )}

          {/* ITERATION 13 — Automation engine */}
          {view === 'automations' && (
            <AutomationsPanel workspaceId={activeWorkspaceId} can={can} onToast={showToast} />
          )}

          {/* ITERATION 13 — Integrations (connectors, webhooks, API tokens) */}
          {view === 'integrations' && (
            <IntegrationsPanel workspaceId={activeWorkspaceId} can={can} onToast={showToast} />
          )}

          {/* ITERATION 19 — Security Center (Cap T: passkeys, conditional access, audit log,
              data residency/BYOK, anomalies, GDPR/DPDP, SOC 2 / ISO 27001 evidence) */}
          {view === 'security' && (
            <SecurityCenter workspaceId={activeWorkspaceId} can={can} onToast={showToast} />
          )}

          {/* TRASH VIEW */}
          {view === 'trash' && (
            <TrashView
              loading={loading}
              trashItems={trashItems}
              restoreFromTrash={restoreFromTrash}
              permanentDelete={permanentDelete}
            />
          )}

          {/* ======================================================
               WI-30 — STANDALONE SEARCH SURFACE (unified work items + articles)
             ====================================================== */}
          {view === 'search' && (
            <SearchView
              workspaceId={activeWorkspaceId}
              onSelectItem={(item) => { setSelectedItem(item); navigate('board'); }}
              onSelectArticle={() => { navigate('knowledge'); }}
            />
          )}

          {/* ======================================================
               ITERATION 6 — CUSTOM DASHBOARDS — extracted to src/views/dashboards-view.jsx (TD-003)
             ====================================================== */}
          {view === 'dashboards' && (
            <DashboardsView
              loading={loading}
              customDashboards={customDashboards}
              selectedDashboard={selectedDashboard}
              dashboardEditMode={dashboardEditMode}
              dashboardScope={dashboardScope}
              dashboardTeamId={dashboardTeamId}
              dashboardAggregate={dashboardAggregate}
              dashboardDrill={dashboardDrill}
              shareInfo={shareInfo}
              teams={teams}
              workItems={workItems}
              sprints={sprints}
              velocityData={velocityData}
              currentUser={currentUser}
              activeWorkspaceId={activeWorkspaceId}
              aiCapabilities={aiCapabilities}
              dashboardRole={dashboardRole}
              acceptDashboardSuggestion={acceptDashboardSuggestion}
              createDashboard={createDashboard}
              openDashboard={openDashboard}
              deleteDashboard={deleteDashboard}
              addDashboardWidget={addDashboardWidget}
              removeDashboardWidget={removeDashboardWidget}
              resizeDashboardWidget={resizeDashboardWidget}
              updateDashboardWidgetConfig={updateDashboardWidgetConfig}
              reorderDashboardWidgets={reorderDashboardWidgets}
              setDashboardEditMode={setDashboardEditMode}
              setSelectedDashboard={setSelectedDashboard}
              setDashboardScope={setDashboardScope}
              setDashboardTeamId={setDashboardTeamId}
              setDashboardDrill={setDashboardDrill}
              setDragWidgetId={setDragWidgetId}
              fetchDashboardAggregate={fetchDashboardAggregate}
              mintShare={mintShare}
              stopShare={stopShare}
              showToast={showToast}
            />
          )}

          {/* REPORT BUILDER — extracted to src/views/reportbuilder-view.jsx (TD-003) */}
          {view === 'reportbuilder' && (
            <ReportBuilderView
              loading={loading}
              reports={reports}
              selectedReport={selectedReport}
              reportEditMode={reportEditMode}
              reportSections={reportSections}
              reportTemplates={reportTemplates}
              scheduleManagerOpen={scheduleManagerOpen}
              reportSchedules={reportSchedules}
              scheduleForm={scheduleForm}
              workItems={workItems}
              activeWorkspaceId={activeWorkspaceId}
              createBlankReport={createBlankReport}
              createReportFromTemplate={createReportFromTemplate}
              openReport={openReport}
              deleteReport={deleteReport}
              saveReport={saveReport}
              addReportSection={addReportSection}
              updateReportSection={updateReportSection}
              moveReportSection={moveReportSection}
              removeReportSection={removeReportSection}
              openScheduleManager={openScheduleManager}
              toggleReportSchedule={toggleReportSchedule}
              deleteReportSchedule={deleteReportSchedule}
              createReportSchedule={createReportSchedule}
              setSelectedReport={setSelectedReport}
              setReportEditMode={setReportEditMode}
              setScheduleManagerOpen={setScheduleManagerOpen}
              setScheduleForm={setScheduleForm}
              showToast={showToast}
            />
          )}

          {/* ======================================================
               ITERATION 5 — KNOWLEDGE REPOSITORY
             ====================================================== */}
          {view === 'knowledge' && (
            <KnowledgeView
              loading={loading}
              knowledgeSearch={knowledgeSearch}
              knowledgeTab={knowledgeTab}
              knowledgeSpaces={knowledgeSpaces}
              selectedSpace={selectedSpace}
              selectedArticle={selectedArticle}
              editingArticle={editingArticle}
              articlePanel={articlePanel}
              knowledgeSearchResults={knowledgeSearchResults}
              knowledgeArticles={knowledgeArticles}
              articleVersions={articleVersions}
              articleComments={articleComments}
              articleAnalytics={articleAnalytics}
              newArticleComment={newArticleComment}
              can={can}
              setKnowledgeSearch={setKnowledgeSearch}
              setKnowledgeTab={setKnowledgeTab}
              setSelectedSpace={setSelectedSpace}
              setSelectedArticle={setSelectedArticle}
              setEditingArticle={setEditingArticle}
              setArticlePanel={setArticlePanel}
              setNewArticleComment={setNewArticleComment}
              setIsSpaceFormOpen={setIsSpaceFormOpen}
              setIsArticleFormOpen={setIsArticleFormOpen}
              setArticleForm={setArticleForm}
              searchKnowledge={searchKnowledge}
              fetchKnowledgeArticles={fetchKnowledgeArticles}
              deleteKnowledgeSpace={deleteKnowledgeSpace}
              updateArticle={updateArticle}
              submitArticleForReview={submitArticleForReview}
              publishArticle={publishArticle}
              archiveArticle={archiveArticle}
              restoreArticle={restoreArticle}
              deleteArticle={deleteArticle}
              addArticleComment={addArticleComment}
              toggleArticleComment={toggleArticleComment}
              deleteArticleComment={deleteArticleComment}
              openArticlePanel={openArticlePanel}
              rejectArticle={rejectArticle}
              articleChildren={articleChildren}
              fetchArticleChildren={fetchArticleChildren}
              fetchArticleDetail={fetchArticleDetail}
              knowledgeSpacesLoading={knowledgeSpacesLoading}
              knowledgeArticlesLoading={knowledgeArticlesLoading}
              workspaceId={activeWorkspaceId}
              aiCapabilities={aiCapabilities}
            />
          )}

          {/* ======================================================
               ITERATION 6 — RELEASES
             ====================================================== */}
          {view === 'releases' && (
            <ReleasesView
              loading={loading}
              releases={releases}
              releaseSearch={releaseSearch}
              selectedRelease={selectedRelease}
              releaseItems={releaseItems}
              projects={projects}
              workItems={workItems}
              setIsReleaseOpen={setIsReleaseOpen}
              setReleaseSearch={setReleaseSearch}
              setSelectedRelease={setSelectedRelease}
              setSelectedItem={setSelectedItem}
              fetchReleases={fetchReleases}
              fetchReleaseItems={fetchReleaseItems}
              updateRelease={updateRelease}
              deleteRelease={deleteRelease}
              removeItemFromRelease={removeItemFromRelease}
              addItemToRelease={addItemToRelease}
              onPressKey={onPressKey}
            />
          )}

          {view === 'sla' && (
            <SlaView workspaceId={activeWorkspaceId} canManage={can('manage_sla')} onToast={showToast} />
          )}


          {view === 'smcockpit' && (
            <ScrumMasterCockpitView
              loading={loading}
              i15ProjectId={i15ProjectId}
              cockpitContext={cockpitContext}
              ceremonies={ceremonies}
              activeCeremony={activeCeremony}
              newCeremony={newCeremony}
              currentUserId={currentUser?.id}
              myDay={myDay}
              fetchMyDay={fetchMyDay}
              submitMyStandup={submitMyStandup}
              fetchCockpitContext={fetchCockpitContext}
              fetchCeremonies={fetchCeremonies}
              scheduleCeremony={scheduleCeremony}
              openCeremony={openCeremony}
              setActiveCeremony={setActiveCeremony}
              setNewCeremony={setNewCeremony}
              startCeremony={startCeremony}
              joinCeremony={joinCeremony}
              excuseCeremony={excuseCeremony}
              completeCeremony={completeCeremony}
              smTab={smTab}
              impediments={impediments}
              newImpediment={newImpediment}
              activeStandup={activeStandup}
              standups={standups}
              standupDraft={standupDraft}
              sprints={sprints}
              riskSprintId={riskSprintId}
              riskPanel={riskPanel}
              planningTimeOff={planningTimeOff}
              planningResult={planningResult}
              capacityBoard={capacityBoard}
              fetchCapacity={fetchCapacity}
              saveMemberCapacity={saveMemberCapacity}
              activeSprint={activeSprint}
              retros={retros}
              activeRetro={activeRetro}
              newRetro={newRetro}
              retroNoteDraft={retroNoteDraft}
              reviewSprintId={reviewSprintId}
              reviewResult={reviewResult}
              patternsResult={patternsResult}
              projects={projects}
              users={users}
              aiCapabilities={aiCapabilities}
              aiLoading={aiLoading}
              activeWorkspaceId={activeWorkspaceId}
              setI15ProjectId={setI15ProjectId}
              fetchImpediments={fetchImpediments}
              fetchStandups={fetchStandups}
              fetchRetros={fetchRetros}
              fetchSprints={fetchSprints}
              setSmTab={setSmTab}
              updateImpediment={updateImpediment}
              setNewImpediment={setNewImpediment}
              createImpediment={createImpediment}
              startStandup={startStandup}
              openStandup={openStandup}
              setActiveStandup={setActiveStandup}
              advanceStandup={advanceStandup}
              completeStandup={completeStandup}
              setStandupDraft={setStandupDraft}
              recordStandup={recordStandup}
              setRiskSprintId={setRiskSprintId}
              runRiskPanel={runRiskPanel}
              varianceSprintId={varianceSprintId}
              setVarianceSprintId={setVarianceSprintId}
              varianceResult={varianceResult}
              runVariance={runVariance}
              coachTips={coachTips}
              fetchCoachTips={fetchCoachTips}
              cockpitLoading={cockpitLoading}
              resetCockpitAnalysis={resetCockpitAnalysis}
              digest={digest}
              fetchDigest={fetchDigest}
              retroClusters={retroClusters}
              clusterRetro={clusterRetro}
              setPlanningTimeOff={setPlanningTimeOff}
              runSprintPlanning={runSprintPlanning}
              setActiveRetro={setActiveRetro}
              openRetro={openRetro}
              setNewRetro={setNewRetro}
              createRetro={createRetro}
              addRetroNote={addRetroNote}
              setRetroNoteDraft={setRetroNoteDraft}
              voteRetroNote={voteRetroNote}
              convertRetroNote={convertRetroNote}
              setReviewSprintId={setReviewSprintId}
              runReviewPrep={runReviewPrep}
              runPatterns={runPatterns}
              showToast={showToast}
              aiAction={aiAction}
            />
          )}

          {view === 'poworkspace' && (
            <PoWorkspaceView
              loading={loading}
              i15ProjectId={i15ProjectId}
              projects={projects}
              poTab={poTab}
              roadmapThemes={roadmapThemes}
              newTheme={newTheme}
              ideas={ideas}
              newIdea={newIdea}
              feedbackItems={feedbackItems}
              feedbackClusters={feedbackClusters}
              newFeedback={newFeedback}
              objectives={objectives}
              activeObjective={activeObjective}
              newObjective={newObjective}
              newKr={newKr}
              releaseNotesName={releaseNotesName}
              releaseNotesResult={releaseNotesResult}
              setI15ProjectId={setI15ProjectId}
              setPoTab={setPoTab}
              setNewTheme={setNewTheme}
              setNewIdea={setNewIdea}
              setNewFeedback={setNewFeedback}
              setNewObjective={setNewObjective}
              setNewKr={setNewKr}
              setReleaseNotesName={setReleaseNotesName}
              setView={setView}
              setPmProjectId={setPmProjectId}
              updateThemeStatus={updateThemeStatus}
              createTheme={createTheme}
              voteIdea={voteIdea}
              promoteIdea={promoteIdea}
              createIdea={createIdea}
              clusterFeedback={clusterFeedback}
              createFeedback={createFeedback}
              openObjective={openObjective}
              updateKrProgress={updateKrProgress}
              addKeyResult={addKeyResult}
              createObjective={createObjective}
              runReleaseNotes={runReleaseNotes}
              fetchStakeholders={fetchStakeholders}
              deleteTheme={deleteTheme}
            />
          )}
          {/* COMPLIANCE — extracted to src/views/compliance-view.jsx (TD-003) */}
          {view === 'compliance' && (
            <ComplianceView
              loading={loading}
              complianceTab={complianceTab}
              complianceDashboard={complianceDashboard}
              complianceRules={complianceRules}
              complianceTemplates={complianceTemplates}
              complianceViolations={complianceViolations}
              complianceAudit={complianceAudit}
              ruleBuilder={ruleBuilder}
              ruleTestResult={ruleTestResult}
              violationFilter={violationFilter}
              selectedViolations={selectedViolations}
              activeWorkspaceId={activeWorkspaceId}
              aiCapabilities={aiCapabilities}
              can={can}
              AiComplianceSuggestion={AiComplianceSuggestion}
              setComplianceTab={setComplianceTab}
              setRuleBuilder={setRuleBuilder}
              setViolationFilter={setViolationFilter}
              newRuleBuilder={newRuleBuilder}
              saveRule={saveRule}
              testRule={testRule}
              evaluateRule={evaluateRule}
              setRuleActive={setRuleActive}
              editRuleBuilder={editRuleBuilder}
              deleteRule={deleteRule}
              cloneTemplate={cloneTemplate}
              fetchComplianceDashboard={fetchComplianceDashboard}
              fetchComplianceRules={fetchComplianceRules}
              fetchComplianceTemplates={fetchComplianceTemplates}
              fetchComplianceViolations={fetchComplianceViolations}
              fetchComplianceAudit={fetchComplianceAudit}
              actOnViolation={actOnViolation}
              bulkAcknowledge={bulkAcknowledge}
              toggleViolationSelect={toggleViolationSelect}
              selectAllViolations={selectAllViolations}
              exportComplianceAudit={exportComplianceAudit}
              projects={projects}
              showToast={showToast}
              anyCapabilityEnabled={anyCapabilityEnabled}
            />
          )}
          {/* SERVICE DESK — extracted to src/views/service-view.jsx (TD-003) */}
          {view === 'service' && (
            <ServiceView
              loading={loading}
              serviceTab={serviceTab}
              serviceQueue={serviceQueue}
              serviceRequests={serviceRequests}
              serviceCustomers={serviceCustomers}
              serviceTypes={serviceTypes}
              serviceTiers={serviceTiers}
              serviceCsat={serviceCsat}
              newCustomer={newCustomer}
              formDesignerTypeId={formDesignerTypeId}
              can={can}
              setServiceTab={setServiceTab}
              setServiceQueue={setServiceQueue}
              setNewCustomer={setNewCustomer}
              setFormDesignerTypeId={setFormDesignerTypeId}
              fetchServiceRequests={fetchServiceRequests}
              fetchServiceCustomers={fetchServiceCustomers}
              fetchServiceTypes={fetchServiceTypes}
              fetchServiceTiers={fetchServiceTiers}
              fetchServiceCsat={fetchServiceCsat}
              assignServiceRequest={assignServiceRequest}
              transitionServiceRequest={transitionServiceRequest}
              createServiceCustomer={createServiceCustomer}
              showToast={showToast}
            />
          )}

          </React.Suspense>
  );
}
