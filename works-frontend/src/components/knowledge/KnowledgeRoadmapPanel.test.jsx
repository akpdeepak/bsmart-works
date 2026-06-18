import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeRoadmapPanel } from './KnowledgeRoadmapPanel';

describe('KnowledgeRoadmapPanel', () => {
  it('renders health, gaps, duplicates, graph, saved search, translation and Slack sections', async () => {
    const user = userEvent.setup();
    const onOpenArticle = vi.fn();
    render(
      <KnowledgeRoadmapPanel
        article={{ id: 'a1', title: 'Deploy runbook', status: 'DRAFT', content: 'Deploy runbook rollback owner.' }}
        articles={[
          { id: 'a1', title: 'Deploy runbook', content: 'Deploy runbook rollback owner.' },
          { id: 'a2', title: 'Rollback runbook', content: 'Rollback deploy runbook owner.' },
        ]}
        related={[]}
        comments={[{ resolved: false }]}
        searchQuery="deploy"
        onOpenArticle={onOpenArticle}
      />,
    );

    expect(screen.getByRole('complementary', { name: /knowledge health dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Knowledge health score/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rollback runbook/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /save current search/i }));
    expect(screen.getByText('deploy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Draft' }));
    expect(screen.getByLabelText(/translation draft/i).value).toContain('[Hindi translation draft]');
    expect(screen.getByLabelText(/slack share message/i).value).toContain('Deploy runbook');
  });
});
