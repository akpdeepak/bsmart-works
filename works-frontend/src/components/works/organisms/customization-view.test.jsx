import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomizationView } from './customization-view';
import { configClient, writePath, toggleIn, normalizeDoc } from '@/lib/customization';
import { expectNoA11yViolations } from '@/test/a11y';

vi.mock('@/lib/customization', async () => {
  const actual = await vi.importActual('@/lib/customization');
  return {
    ...actual,
    configClient: {
      settings: vi.fn(), updateSettings: vi.fn(), versions: vi.fn(), diff: vi.fn(),
      rollback: vi.fn(), impact: vi.fn(), export: vi.fn(), import: vi.fn(),
      templates: vi.fn(), saveTemplate: vi.fn(), applyTemplate: vi.fn(), deleteTemplate: vi.fn(),
      sandboxes: vi.fn(), sandbox: vi.fn(), createSandbox: vi.fn(), updateSandbox: vi.fn(),
      promoteSandbox: vi.fn(), discardSandbox: vi.fn(), extensionPoints: vi.fn(),
    },
  };
});

const LIVE = {
  workspaceId: 'WS-1',
  currentVersion: 3,
  document: JSON.stringify({
    settings: { branding: { appName: 'bSmart Works' }, locale: 'en-IN', timezone: 'Asia/Kolkata' },
    forms: [], pages: [], extensions: [], locks: [],
  }),
};

describe('customization-view pure helpers', () => {
  it('writePath sets a nested value immutably', () => {
    const before = { settings: { locale: 'en-IN' } };
    const after = writePath(before, 'settings.timezone', 'UTC');
    expect(after.settings.timezone).toBe('UTC');
    expect(after.settings.locale).toBe('en-IN');
    expect(before.settings.timezone).toBeUndefined(); // original untouched
  });

  it('toggleIn adds then removes a value', () => {
    expect(toggleIn(['MON'], 'TUE')).toEqual(['MON', 'TUE']);
    expect(toggleIn(['MON', 'TUE'], 'MON')).toEqual(['TUE']);
  });

  it('normalizeDoc fills the five sections', () => {
    const d = normalizeDoc({ settings: { locale: 'x' } });
    expect(d).toHaveProperty('forms');
    expect(d).toHaveProperty('pages');
    expect(d).toHaveProperty('extensions');
    expect(d.locks).toEqual([]);
  });
});

describe('CustomizationView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configClient.settings.mockResolvedValue(LIVE);
  });

  it('renders the Settings tab with the live version and branding field', async () => {
    render(<CustomizationView workspaceId="WS-1" canManage onToast={() => {}} />);
    expect(await screen.findByText(/Live version 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText('App name')).toHaveValue('bSmart Works');
    expect(screen.getByLabelText('Timezone')).toHaveValue('Asia/Kolkata');
  });

  it('shows a read-only badge when the user cannot manage', async () => {
    render(<CustomizationView workspaceId="WS-1" canManage={false} onToast={() => {}} />);
    expect(await screen.findByText(/Read-only/i)).toBeInTheDocument();
  });

  it('loads versions when the Versions tab is opened', async () => {
    configClient.versions.mockResolvedValue([
      { id: 'CV-1', versionNumber: 3, source: 'MANUAL', summary: 'change tz', createdAt: '2026-06-01T10:00:00Z' },
    ]);
    render(<CustomizationView workspaceId="WS-1" canManage onToast={() => {}} />);
    await screen.findByText(/Live version 3/i);
    fireEvent.click(screen.getByRole('button', { name: /Versions/i }));
    await waitFor(() => expect(configClient.versions).toHaveBeenCalledWith('WS-1'));
    expect(await screen.findByText(/change tz/i)).toBeInTheDocument();
    expect(screen.getByText('MANUAL')).toBeInTheDocument();
  });

  // Regression: the impact-confirmation modal must be keyboard-operable (RB-30 §6) — focus moves
  // into it on open and Escape dismisses it.
  it('opens the impact dialog and closes it with the Escape key', async () => {
    configClient.templates.mockResolvedValue([
      { id: 'TPL-1', name: 'Onboarding', description: 'starter', document: LIVE.document, createdAt: '2026-06-01T10:00:00Z' },
    ]);
    configClient.impact.mockResolvedValue({ affectedItems: 2, affectedUsers: 1, affectedAutomations: 0, warnings: [], changes: [] });

    render(<CustomizationView workspaceId="WS-1" canManage onToast={() => {}} />);
    await screen.findByText(/Live version 3/i);
    fireEvent.click(screen.getByRole('button', { name: /Templates/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^Apply$/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Focus landed on the Cancel button inside the dialog.
    expect(screen.getByRole('button', { name: /Cancel/i })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('has no serious accessibility violations on the Settings tab', async () => {
    const { container } = render(<CustomizationView workspaceId="WS-1" canManage onToast={() => {}} />);
    await screen.findByText(/Live version 3/i);
    await expectNoA11yViolations(container);
  });
});
