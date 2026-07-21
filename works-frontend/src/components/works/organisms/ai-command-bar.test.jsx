import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiCommandBar } from './ai-command-bar';
import { aiClient } from '@/lib/ai';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return {
    ...actual,
    aiClient: {
      capabilities: vi.fn(),
      parseCommand: vi.fn(),
      executePlan: vi.fn(),
    },
  };
});

const ENABLED_CAPS = [
  { id: 'command_bar', label: 'Conversational command bar', enabled: true, fallback: 'Manual forms.' },
  { id: 'triage', label: 'Smart triage', enabled: false, fallback: 'Defaults.' },
];

describe('AiCommandBar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when no capability is enabled (AI off → button disappears)', async () => {
    aiClient.capabilities.mockResolvedValue([{ id: 'x', label: 'X', enabled: false, fallback: 'f' }]);
    const { container } = render(<AiCommandBar workspaceId="ws-1" />);
    await waitFor(() => expect(aiClient.capabilities).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('shows the AI button when a capability is enabled', async () => {
    aiClient.capabilities.mockResolvedValue(ENABLED_CAPS);
    render(<AiCommandBar workspaceId="ws-1" />);
    expect(await screen.findByRole('button', { name: /open ai command bar/i })).toBeInTheDocument();
  });

  it('parses a command into an editable plan and confirms execution', async () => {
    aiClient.capabilities.mockResolvedValue(ENABLED_CAPS);
    aiClient.parseCommand.mockResolvedValue({
      text: 'Here is what I will do',
      steps: [{ action: 'CREATE_ITEM', description: 'Create Bug: login', params: { title: 'login' } }],
    });
    aiClient.executePlan.mockResolvedValue({ executed: 1, results: [{ ok: true, id: 'WEB-1' }] });
    const onToast = vi.fn();
    const onExecuted = vi.fn();

    render(<AiCommandBar workspaceId="ws-1" onToast={onToast} onExecuted={onExecuted} />);
    fireEvent.click(await screen.findByRole('button', { name: /open ai command bar/i }));

    const input = screen.getByLabelText('AI command');
    fireEvent.change(input, { target: { value: 'create a bug login' } });
    fireEvent.click(screen.getByRole('button', { name: /^go$/i }));

    await screen.findByDisplayValue('Create Bug: login');
    fireEvent.click(screen.getByRole('button', { name: /confirm & run/i }));

    await waitFor(() => expect(aiClient.executePlan).toHaveBeenCalledWith('ws-1', expect.any(Array)));
    await waitFor(() => expect(onExecuted).toHaveBeenCalled());
    expect(onToast).toHaveBeenCalledWith(expect.stringContaining('1/1'), 'success');
  });
});
