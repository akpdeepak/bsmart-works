import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import KnowledgeTemplatesView from './knowledge-templates-view';
import { templatesClient, extractionClient } from '@/lib/knowledge-advanced';

vi.mock('@/lib/knowledge-advanced', () => ({
  templatesClient: {
    list: vi.fn(),
    create: vi.fn(),
  },
  extractionClient: {
    extract: vi.fn(),
  },
}));

const TEMPLATES = [
  { id: 'DTPL-1', name: 'Operational Runbook', category: 'RUNBOOK', description: 'Operate a service.' },
  { id: 'DTPL-2', name: 'Incident Postmortem', category: 'POSTMORTEM', description: 'Blameless review.' },
];

describe('KnowledgeTemplatesView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the templates returned from the API', async () => {
    templatesClient.list.mockResolvedValue(TEMPLATES);

    render(<KnowledgeTemplatesView workspaceId="WS-001" />);

    expect(await screen.findByText('Operational Runbook')).toBeInTheDocument();
    expect(screen.getByText('Incident Postmortem')).toBeInTheDocument();
    expect(templatesClient.list).toHaveBeenCalledWith('WS-001');
  });

  it('shows the empty state when there are no templates', async () => {
    templatesClient.list.mockResolvedValue([]);

    render(<KnowledgeTemplatesView workspaceId="WS-001" />);

    expect(await screen.findByText('No templates yet')).toBeInTheDocument();
  });

  it('creates a template through the client', async () => {
    templatesClient.list.mockResolvedValue([]);
    templatesClient.create.mockResolvedValue({ id: 'DTPL-9', name: 'My Template', category: 'KB' });

    render(<KnowledgeTemplatesView workspaceId="WS-001" />);
    await screen.findByText('No templates yet');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My Template' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create template' }));

    await waitFor(() => expect(templatesClient.create).toHaveBeenCalledWith(
      'WS-001', expect.objectContaining({ name: 'My Template' })));
    expect(await screen.findByText('My Template')).toBeInTheDocument();
  });

  it('extracts fields and renders them with the AI/offline meta badge', async () => {
    templatesClient.list.mockResolvedValue([]);
    extractionClient.extract.mockResolvedValue({
      fields: { emails: ['dev@bcits.in'], dates: ['2026-06-07'], keyValues: { Owner: 'Deepak' } },
      usedAi: false,
      fallback: true,
      policyState: 'DISABLED_WORKSPACE',
      tier: 'NONE',
    });

    render(<KnowledgeTemplatesView workspaceId="WS-001" />);
    await screen.findByText('No extraction yet');

    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Owner: Deepak\ndev@bcits.in 2026-06-07' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract fields' }));

    await waitFor(() => expect(extractionClient.extract).toHaveBeenCalledWith('WS-001', expect.any(String)));
    expect(await screen.findByText('dev@bcits.in')).toBeInTheDocument();
    expect(screen.getByText('2026-06-07')).toBeInTheDocument();
    // The deterministic fallback is surfaced honestly as "Offline".
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('has no serious a11y violations with templates listed', async () => {
    templatesClient.list.mockResolvedValue(TEMPLATES);
    const { container } = render(<KnowledgeTemplatesView workspaceId="WS-001" />);
    await screen.findByText('Operational Runbook');
    await expectNoA11yViolations(container);
  });
});
