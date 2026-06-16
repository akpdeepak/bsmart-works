import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SavedViewsPanel } from './saved-views-panel';

// Mock the query hooks so we don't hit the network.
vi.mock('@/hooks/queries/useSavedViews', () => ({
  useSavedViews: vi.fn(),
  useSavedViewMutations: vi.fn(),
}));

import { useSavedViews, useSavedViewMutations } from '@/hooks/queries/useSavedViews';

const VIEW_A = { id: 'VIEW-A', name: 'Open Bugs', displayOrder: 0 };
const VIEW_B = { id: 'VIEW-B', name: 'My Stories', displayOrder: 1 };

function wrapper({ children }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

const noopMutations = {
  rename: { mutate: vi.fn() },
  remove: { mutate: vi.fn() },
  reorder: { mutate: vi.fn() },
};

beforeEach(() => {
  useSavedViewMutations.mockReturnValue(noopMutations);
});

describe('SavedViewsPanel', () => {
  it('shows a loading skeleton while data is loading', () => {
    useSavedViews.mockReturnValue({ data: [], isLoading: true });
    render(<SavedViewsPanel workspaceId="ws-1" />, { wrapper });
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('shows empty message when there are no views', () => {
    useSavedViews.mockReturnValue({ data: [], isLoading: false });
    render(<SavedViewsPanel workspaceId="ws-1" />, { wrapper });
    expect(screen.getByText(/no saved views yet/i)).toBeInTheDocument();
  });

  it('renders view names as list items', () => {
    useSavedViews.mockReturnValue({ data: [VIEW_A, VIEW_B], isLoading: false });
    render(<SavedViewsPanel workspaceId="ws-1" />, { wrapper });
    expect(screen.getByRole('button', { name: 'Open Bugs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Stories' })).toBeInTheDocument();
  });

  it('calls onLoad when a view name is clicked', () => {
    useSavedViews.mockReturnValue({ data: [VIEW_A], isLoading: false });
    const onLoad = vi.fn();
    render(<SavedViewsPanel workspaceId="ws-1" onLoad={onLoad} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Open Bugs' }));
    expect(onLoad).toHaveBeenCalledWith(VIEW_A);
  });

  it('highlights the active view with aria-current', () => {
    useSavedViews.mockReturnValue({ data: [VIEW_A, VIEW_B], isLoading: false });
    render(<SavedViewsPanel workspaceId="ws-1" activeViewId="VIEW-A" />, { wrapper });
    expect(screen.getByRole('button', { name: 'Open Bugs' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'My Stories' })).not.toHaveAttribute('aria-current');
  });

  it('shows an inline rename input when the pencil button is clicked', () => {
    useSavedViews.mockReturnValue({ data: [VIEW_A], isLoading: false });
    render(<SavedViewsPanel workspaceId="ws-1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /rename "Open Bugs"/i }));
    expect(screen.getByRole('textbox', { name: /rename view/i })).toBeInTheDocument();
  });

  it('calls rename.mutate on Enter with the new name', () => {
    const rename = { mutate: vi.fn() };
    useSavedViewMutations.mockReturnValue({ ...noopMutations, rename });
    useSavedViews.mockReturnValue({ data: [VIEW_A], isLoading: false });
    render(<SavedViewsPanel workspaceId="ws-1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /rename "Open Bugs"/i }));
    const input = screen.getByRole('textbox', { name: /rename view/i });
    fireEvent.change(input, { target: { value: 'Critical Bugs' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(rename.mutate).toHaveBeenCalledWith({ id: 'VIEW-A', name: 'Critical Bugs' });
  });

  it('Escape cancels rename without calling mutate', () => {
    const rename = { mutate: vi.fn() };
    useSavedViewMutations.mockReturnValue({ ...noopMutations, rename });
    useSavedViews.mockReturnValue({ data: [VIEW_A], isLoading: false });
    render(<SavedViewsPanel workspaceId="ws-1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /rename "Open Bugs"/i }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: /rename view/i }), { key: 'Escape' });
    expect(rename.mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: /rename view/i })).not.toBeInTheDocument();
  });

  it('shows a delete confirm row when the X button is clicked', () => {
    useSavedViews.mockReturnValue({ data: [VIEW_A], isLoading: false });
    render(<SavedViewsPanel workspaceId="ws-1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /delete "Open Bugs"/i }));
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  it('calls remove.mutate when Yes is clicked', () => {
    const remove = { mutate: vi.fn() };
    useSavedViewMutations.mockReturnValue({ ...noopMutations, remove });
    useSavedViews.mockReturnValue({ data: [VIEW_A], isLoading: false });
    render(<SavedViewsPanel workspaceId="ws-1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /delete "Open Bugs"/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(remove.mutate).toHaveBeenCalledWith('VIEW-A');
  });

  it('dismisses confirm row on No without deleting', () => {
    const remove = { mutate: vi.fn() };
    useSavedViewMutations.mockReturnValue({ ...noopMutations, remove });
    useSavedViews.mockReturnValue({ data: [VIEW_A], isLoading: false });
    render(<SavedViewsPanel workspaceId="ws-1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /delete "Open Bugs"/i }));
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(remove.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open Bugs' })).toBeInTheDocument();
  });
});
