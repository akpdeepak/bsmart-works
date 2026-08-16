/**
 * Focused tests for the WorkItemDetailPanel header — specifically the "Copy link" button
 * added in audit #28 (entity deep-links). The panel itself renders many sub-components so
 * we mock them to isolate only the header behaviour under test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mock all sub-components that the panel imports so they return null and don't
//    pull in complex API-dependent trees. ────────────────────────────────────────
vi.mock('@/components/works/work-item-type', () => ({ TypeBadge: () => null }));
vi.mock('@/components/works/organisms/watch-button', () => ({ WatchButton: () => null }));
vi.mock('@/components/knowledge/SaveToKnowButton', () => ({ SaveToKnowButton: () => null }));
vi.mock('./work-item-detail/details-tab', () => ({ DetailsTab: () => null }));
vi.mock('./work-item-detail/comments-tab', () => ({ CommentsTab: () => null }));
vi.mock('./work-item-detail/links-tab', () => ({ LinksTab: () => null }));
vi.mock('./work-item-detail/attachments-tab', () => ({ AttachmentsTab: () => null }));
vi.mock('./work-item-detail/activity-tab', () => ({ ActivityTab: () => null }));

import { WorkItemDetailPanel } from './work-item-detail-panel';

// Minimal props required for the panel header to render without crashing.
const minProps = {
  selectedItem: {
    id: 'WI-42',
    type: 'TASK',
    autoId: 'WI-42',
    displayKey: 'PLAT-42',
    title: 'Fix invoice sync',
    status: 'In Progress',
    priority: 'HIGH',
    assigneeId: 'USR-1',
    dueDate: '2026-06-25',
    customerVisible: true,
    starred: false,
  },
  setSelectedItem: vi.fn(),
  toggleStar: vi.fn(),
  handleDelete: vi.fn(),
  can: () => false,
  handleUpdateItem: vi.fn(),
  setIsWorklogOpen: vi.fn(),
  detailTab: 'details',
  setDetailTab: vi.fn(),
  tagInput: '',
  setTagInput: vi.fn(),
  workItems: [],
  itemChildren: [],
  users: [{ id: 'USR-1', fullName: 'Asha Rao' }],
  aiCapabilities: {},
  aiLoading: false,
  aiAction: vi.fn(),
  activeWorkspaceId: 'WS-1',
  fieldDefs: [],
  fieldValues: {},
  setFieldValues: vi.fn(),
  saveFieldValue: vi.fn(),
  comments: [{ id: 'C-1' }, { id: 'C-2' }],
  currentUser: { id: 'USR-1' },
  newComment: '',
  handleCommentInput: vi.fn(),
  handleAddComment: vi.fn(),
  commentInternal: false,
  setCommentInternal: vi.fn(),
  replyingTo: null,
  setReplyingTo: vi.fn(),
  replyBody: '',
  setReplyBody: vi.fn(),
  addReply: vi.fn(),
  mentionOpen: false,
  mentionQuery: '',
  insertMention: vi.fn(),
  links: [{ id: 'L-1', url: 'https://github.com/acme/repo/pull/12' }],
  newLink: {},
  setNewLink: vi.fn(),
  handleDeleteLink: vi.fn(),
  handleCreateLink: vi.fn(),
  handleSetParent: vi.fn(),
  handleAddChild: vi.fn(),
  handleRemoveChild: vi.fn(),
  attachments: [{ id: 'F-1' }],
  fileInputRef: { current: null },
  handleUploadFile: vi.fn(),
  handleAttachLink: vi.fn(),
  handleDeleteAttachment: vi.fn(),
  maxUploadMb: 10,
  activity: [{ id: 'E-1' }],
  statusMetrics: null,
  activityEventFilter: '',
  setActivityEventFilter: vi.fn(),
  setActivity: vi.fn(),
  reportError: vi.fn(),
  statusResolver: null,
  fieldPrefs: {},
  onToggleFieldPref: vi.fn(),
};

describe('WorkItemDetailPanel — Copy link button (audit #28)', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders a "Copy link to this item" button in the panel header', () => {
    render(<WorkItemDetailPanel {...minProps} />);
    expect(screen.getByRole('button', { name: 'Copy link to this item' })).toBeInTheDocument();
  });

  it('writes the correct deep-link URL to the clipboard when clicked', () => {
    render(<WorkItemDetailPanel {...minProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy link to this item' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/items/WI-42`,
    );
  });

  it('renders a cited execution brief for the selected work item', () => {
    render(<WorkItemDetailPanel {...minProps} />);

    expect(screen.getByLabelText('Work item execution brief')).toBeInTheDocument();
    expect(screen.getByText(/PLAT-42 is/)).toBeInTheDocument();
    expect(screen.getByText('with')).toBeInTheDocument();
    expect(screen.getByText('priority, owned by')).toBeInTheDocument();
    expect(screen.getByText(/Sources: work item fields, 2 comments, 1 activity event, 1 link, 1 file/)).toBeInTheDocument();
    expect(screen.getByText('Customer-visible')).toBeInTheDocument();
    expect(screen.getByText('Linked code available')).toBeInTheDocument();
  });
});
