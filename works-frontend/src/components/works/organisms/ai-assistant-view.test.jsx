import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiAssistantView } from './ai-assistant-view';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn(), raw: vi.fn() } }));

describe('AiAssistantView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the header and both modes', () => {
    render(<AiAssistantView workspaceId="WS-001" />);
    expect(screen.getByRole('heading', { name: /AI Assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /natural language/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Summarize/i })).toBeInTheDocument();
  });

  it('previews NL→BQL with a confirm-first plan and runs it on confirm', async () => {
    const user = userEvent.setup();
    const onRunBql = vi.fn();
    api.send.mockResolvedValue({
      capability: 'NL_TO_BQL', output: 'type = "Bug" AND assignee = currentUser()',
      confident: true, aiEnabled: true, fallbackUsed: true, modelTier: 'DETERMINISTIC',
      policyState: 'NORMAL', plan: "Here's what I'll do: run the query …",
    });
    render(<AiAssistantView workspaceId="WS-001" onRunBql={onRunBql} />);
    await user.type(screen.getByPlaceholderText(/open bugs assigned to me/i), 'my bugs');
    await user.click(screen.getByRole('button', { name: /Ask AI/i }));
    expect(await screen.findByText(/type = "Bug"/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Confirm & run/i }));
    expect(onRunBql).toHaveBeenCalledWith('type = "Bug" AND assignee = currentUser()');
  });

  it('shows the deterministic / AI-off state gracefully', async () => {
    const user = userEvent.setup();
    api.send.mockResolvedValue({
      capability: 'NL_TO_BQL', output: '', confident: false, aiEnabled: false,
      fallbackUsed: true, modelTier: 'DETERMINISTIC', policyState: 'OFF',
      plan: "Couldn't confidently interpret that — switch to the manual BQL/visual builder.",
    });
    render(<AiAssistantView workspaceId="WS-001" />);
    await user.type(screen.getByPlaceholderText(/open bugs assigned to me/i), 'xyzzy');
    await user.click(screen.getByRole('button', { name: /Ask AI/i }));
    expect(await screen.findByText(/AI off — deterministic/i)).toBeInTheDocument();
    expect(screen.getByText(/manual BQL/i)).toBeInTheDocument();
  });
});
