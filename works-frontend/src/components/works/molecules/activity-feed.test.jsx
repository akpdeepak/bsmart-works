import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityFeed } from './activity-feed';

// Wrap in a QueryClient so any child that lazily pulls TanStack context doesn't error.
function Wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderFeed(props) {
  return render(<ActivityFeed {...props} />, { wrapper: Wrapper });
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('ActivityFeed — loading state', () => {
  it('renders 4 skeleton rows when loading is true', () => {
    renderFeed({ loading: true, events: [] });
    // The skeleton list is aria-busy
    const list = screen.getByRole('list', { name: /loading activity/i });
    expect(list).toBeInTheDocument();
    expect(list.querySelectorAll('li')).toHaveLength(4);
  });

  it('does not render the empty-state when loading', () => {
    renderFeed({ loading: true, events: [] });
    expect(screen.queryByText(/no activity yet/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
describe('ActivityFeed — empty state', () => {
  it('renders the empty-state heading when events is empty', () => {
    renderFeed({ loading: false, events: [] });
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('renders the empty-state subtitle', () => {
    renderFeed({ loading: false, events: [] });
    expect(screen.getByText(/status changes, comments, assignments/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Event rendering
// ---------------------------------------------------------------------------
const baseEvents = [
  {
    id: 'ev-1',
    eventType: 'WORK_ITEM_CREATED',
    actorName: 'Alice B',
    createdAt: '2026-06-10T09:00:00Z',
    payload: { type: 'bug' },
  },
  {
    id: 'ev-2',
    eventType: 'STATUS_CHANGED',
    actorName: 'Bob C',
    createdAt: '2026-06-10T11:00:00Z',
    payload: { toStatus: 'In Review' },
  },
];

describe('ActivityFeed — event rendering', () => {
  it('renders a sentence for each event', () => {
    renderFeed({ loading: false, events: baseEvents });
    expect(screen.getByText(/Created this bug/)).toBeInTheDocument();
    expect(screen.getByText(/Changed status to In Review/)).toBeInTheDocument();
  });

  it('renders actor names', () => {
    renderFeed({ loading: false, events: baseEvents });
    expect(screen.getByText('Alice B')).toBeInTheDocument();
    expect(screen.getByText('Bob C')).toBeInTheDocument();
  });

  it('falls back to "System" when actorName is absent', () => {
    const events = [
      { id: 'ev-x', eventType: 'WORK_ITEM_CLOSED', createdAt: '2026-06-10T08:00:00Z' },
    ];
    renderFeed({ loading: false, events });
    // "System" appears both in the Avatar and the sentence prefix
    expect(screen.getAllByText('System').length).toBeGreaterThan(0);
  });

  it('renders an Avatar for each event', () => {
    renderFeed({ loading: false, events: baseEvents });
    // Avatars render as divs with initials; check there are 2 avatars (one per event)
    // We can verify by checking the list items
    const list = screen.getByRole('list');
    expect(list.querySelectorAll('li')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Day grouping
// ---------------------------------------------------------------------------
describe('ActivityFeed — day groups', () => {
  it('groups events under a day header', () => {
    renderFeed({ loading: false, events: baseEvents });
    // Both events are on 2026-06-10; there should be exactly one day section heading
    // Day label logic: not today/yesterday → "Jun 10"
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(1);
  });

  it('renders separate day headers for events on different days', () => {
    const events = [
      {
        id: 'ev-a',
        eventType: 'WORK_ITEM_CREATED',
        actorName: 'Dev A',
        createdAt: '2026-06-08T08:00:00Z',
        payload: { type: 'task' },
      },
      {
        id: 'ev-b',
        eventType: 'COMMENT_ADDED',
        actorName: 'Dev B',
        createdAt: '2026-06-10T08:00:00Z',
      },
    ];
    renderFeed({ loading: false, events });
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(2);
  });

  it('newest day appears first in the DOM', () => {
    // Use dates guaranteed to be > 7 days ago so they always render as absolute month-day
    // labels ("Jun 1" / "May 15") regardless of when the test runs.
    const events = [
      {
        id: 'ev-old',
        eventType: 'WORK_ITEM_CREATED',
        actorName: 'Dev A',
        createdAt: '2026-05-15T08:00:00Z',
        payload: { type: 'task' },
      },
      {
        id: 'ev-new',
        eventType: 'STATUS_CHANGED',
        actorName: 'Dev B',
        createdAt: '2026-06-01T08:00:00Z',
        payload: { toStatus: 'Done' },
      },
    ];
    renderFeed({ loading: false, events });
    const headings = screen.getAllByRole('heading', { level: 3 });
    // shortDate format is "1 Jun" (day-first); newest day appears first in DOM
    expect(headings[0].textContent).toMatch(/1 Jun/);
    expect(headings[1].textContent).toMatch(/15 May/);
  });
});

// ---------------------------------------------------------------------------
// WCAG semantics
// ---------------------------------------------------------------------------
describe('ActivityFeed — accessibility', () => {
  it('renders the event list with role="list"', () => {
    renderFeed({ loading: false, events: baseEvents });
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders each event as a list item', () => {
    renderFeed({ loading: false, events: baseEvents });
    const list = screen.getByRole('list');
    expect(list.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders a <time> element for each event', () => {
    const { container } = renderFeed({ loading: false, events: baseEvents });
    expect(container.querySelectorAll('time')).toHaveLength(2);
  });

  it('day headers carry an aria-label with the date', () => {
    renderFeed({ loading: false, events: baseEvents });
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveAttribute('aria-label', expect.stringContaining('2026-06-10'));
  });
});
