/* eslint-disable */
import { useState, useEffect, useCallback } from 'react';
import { Shield, Settings, Users, Server, FileText } from 'lucide-react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/works/atoms/card';
import { Button } from '@/components/works/button';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';

const USER_TYPES = [
  { id: 'INDIVIDUAL', label: 'Individual Contributor', desc: 'Focuses on executing work items and participating in their team framework.' },
  { id: 'TEAM_LEAD', label: 'Team Lead / Scrum Master', desc: 'Manages team backlog, sprint/kanban flow, and acts as the local process owner.' },
  { id: 'MANAGEMENT', label: 'Management / PMO', desc: 'Cross-team visibility, portfolio planning, and capability governance.' },
  { id: 'ADMIN', label: 'Workspace Admin', desc: 'Configures workflows, integrations, custom fields, and access policies.' },
  { id: 'OWNER', label: 'Workspace Owner', desc: 'Billing, security, and full platform control.' }
];

export default function OperatingModelView({ workspaceId, api, onToast }) {
  const [policies, setPolicies] = useState(null);
  const [loading, setLoading] = useState(true);
  // Before the AsyncBoundary rollout this view tracked `loading` but never rendered anything for it,
  // and a failed load surfaced only as a transient toast — leaving the policy grid rendered as if
  // every capability were allowed by default. Both states are now explicit (RB-30 §6).
  const [error, setError] = useState(null);

  const loadPolicies = useCallback(() => {
    setLoading(true);
    setError(null);
    api.raw(`/workspaces/${workspaceId}/operating-model`)
      .then(r => r.json())
      .then(data => {
        setPolicies(Array.isArray(data) ? data : []);
      })
      .catch(e => {
        setError(e.message || 'Failed to load operating model policies');
        onToast?.(e.message || 'Failed to load operating model policies', 'error');
      })
      .finally(() => setLoading(false));
  }, [api, workspaceId, onToast]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  function savePolicy(userType, resourceType, actionName, allowed) {
    const payload = { userType, resourceType, actionName, allowed };
    api.raw(`/workspaces/${workspaceId}/operating-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => {
      if (r.ok) {
        onToast?.('Policy updated', 'success');
        loadPolicies();
      } else {
        onToast?.('Failed to update policy', 'error');
      }
    }).catch(e => onToast?.(e.message || 'Failed to update policy', 'error'));
  }

  // Deny-override model (issue 523): a capability is allowed by default (role RBAC decides) unless an
  // explicit policy row restricts it. Unchecking a box writes allowed=false, which the server
  // enforces as a restriction for that business user type; it never grants beyond the user's role.
  function hasPolicy(typeId, res, action) {
    const p = policies?.find(x => x.userType === typeId && x.resourceType === res && x.actionName === action);
    return p ? p.allowed : true;
  }

  return (
    <PageLayout
      title="Operating Model"
      description="Restrict what each of the 5 core user types may do. Capabilities are allowed by default (subject to role); unchecking a box bars that user type from the action even when their role would allow it. It never grants more than a user's role."
    >
      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={loadPolicies}
        errorTitle="Couldn't load the operating model"
        label="Loading operating model policies"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4"
        skeleton={USER_TYPES.map(type => (
          <div key={type.id} className="h-64 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        ))}
      >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {USER_TYPES.map(type => {
          return (
            <Card key={type.id} variant="outlined">
              <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-brand-navy dark:text-brand-orange" />
                  {type.label}
                </CardTitle>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{type.desc}</p>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                    <input 
                      type="checkbox" 
                      checked={hasPolicy(type.id, 'team', 'create')}
                      onChange={e => savePolicy(type.id, 'team', 'create', e.target.checked)}
                      className="rounded border-neutral-300 text-brand-navy focus:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-800"
                    />
                    Can Create Teams
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                    <input 
                      type="checkbox" 
                      checked={hasPolicy(type.id, 'framework', 'manage')}
                      onChange={e => savePolicy(type.id, 'framework', 'manage', e.target.checked)}
                      className="rounded border-neutral-300 text-brand-navy focus:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-800"
                    />
                    Can Manage Frameworks
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                    <input 
                      type="checkbox" 
                      checked={hasPolicy(type.id, 'user', 'invite')}
                      onChange={e => savePolicy(type.id, 'user', 'invite', e.target.checked)}
                      className="rounded border-neutral-300 text-brand-navy focus:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-800"
                    />
                    Can Invite Users
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                    <input 
                      type="checkbox" 
                      checked={hasPolicy(type.id, 'guardrails', 'bypass')}
                      onChange={e => savePolicy(type.id, 'guardrails', 'bypass', e.target.checked)}
                      className="rounded border-neutral-300 text-brand-navy focus:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-800"
                    />
                    Can Bypass Framework Guardrails
                  </label>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
      </AsyncBoundary>
    </PageLayout>
  );
}
