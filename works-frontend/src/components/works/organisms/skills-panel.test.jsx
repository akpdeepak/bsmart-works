import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SkillsPanel } from './skills-panel';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  api: { send: vi.fn() },
}));

const MEMBERS = [
  { id: 'USR-1', fullName: 'Asha Rao', email: 'asha@bcits.in' },
  { id: 'USR-2', fullName: 'Ben Ali', email: 'ben@bcits.in' },
];

/** Routes each call by path so a test only has to state what the server holds. */
function server({ skills = [], people = {}, onPost } = {}) {
  api.send.mockImplementation((path, opts = {}) => {
    if (opts.method === 'POST') return Promise.resolve(onPost ? onPost(path, opts) : {});
    if (path.endsWith('/skills')) return Promise.resolve(skills);
    const match = path.match(/\/skills\/([^/]+)\/people$/);
    if (match) return Promise.resolve(people[match[1]] ?? []);
    return Promise.resolve([]);
  });
}

describe('SkillsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a skeleton while the catalogue loads', () => {
    api.send.mockReturnValue(new Promise(() => {}));
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} />);
    expect(screen.getByLabelText('Loading skills')).toBeInTheDocument();
  });

  it('lists the workspace skill catalogue', async () => {
    server({ skills: [{ id: 'SKL-1', name: 'PostgreSQL', category: 'Data' }] });
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} />);
    expect(await screen.findByRole('button', { name: /PostgreSQL/ })).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('explains an empty catalogue instead of showing a blank card', async () => {
    server({ skills: [] });
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} />);
    expect(await screen.findByText('No skills yet')).toBeInTheDocument();
  });

  it('surfaces a load failure with its server message', async () => {
    api.send.mockRejectedValue(new Error('Workspace not found'));
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} />);
    expect(await screen.findByText('Workspace not found')).toBeInTheDocument();
  });

  it('answers "who holds this skill" when a skill is selected', async () => {
    server({
      skills: [{ id: 'SKL-1', name: 'PostgreSQL', category: 'Data' }],
      people: { 'SKL-1': [{ id: 'PSK-1', userId: 'USR-2', skillId: 'SKL-1', proficiency: 'EXPERT' }] },
    });
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} />);
    fireEvent.click(await screen.findByRole('button', { name: /PostgreSQL/ }));
    // Scoped to the holders list: both "Ben Ali" and "EXPERT" also appear as <option>s below.
    const holders = await screen.findByRole('list', { name: 'People with PostgreSQL' });
    expect(within(holders).getByText('Ben Ali')).toBeInTheDocument();
    expect(within(holders).getByText('EXPERT')).toBeInTheDocument();
  });

  it('says so when nobody holds the selected skill', async () => {
    server({ skills: [{ id: 'SKL-1', name: 'PostgreSQL' }], people: {} });
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} />);
    fireEvent.click(await screen.findByRole('button', { name: /PostgreSQL/ }));
    expect(await screen.findByText(/Nobody has been recorded/)).toBeInTheDocument();
  });

  it('creates a skill and shows it without a manual reload', async () => {
    const created = { id: 'SKL-9', name: 'Kafka', category: 'Platform' };
    let catalogue = [];
    api.send.mockImplementation((path, opts = {}) => {
      if (opts.method === 'POST') {
        catalogue = [created];
        return Promise.resolve(created);
      }
      if (path.endsWith('/skills')) return Promise.resolve(catalogue);
      return Promise.resolve([]);
    });
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} />);
    await screen.findByText('No skills yet');
    fireEvent.change(screen.getByLabelText('Skill name'), { target: { value: 'Kafka' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    expect(await screen.findByRole('button', { name: /Kafka/ })).toBeInTheDocument();
  });

  it('reports a rejected create rather than failing silently', async () => {
    const onToast = vi.fn();
    api.send.mockImplementation((path, opts = {}) => (opts.method === 'POST'
      ? Promise.reject(new Error('A skill with that name already exists in this workspace.'))
      : Promise.resolve([])));
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} onToast={onToast} />);
    await screen.findByText('No skills yet');
    fireEvent.change(screen.getByLabelText('Skill name'), { target: { value: 'Kafka' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(
      'A skill with that name already exists in this workspace.', 'error'));
  });

  /** RB-40: the server is the gate; the UI must not offer a write the caller cannot make. */
  it('hides both write forms from a member without create_items', async () => {
    server({ skills: [{ id: 'SKL-1', name: 'PostgreSQL' }] });
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} can={() => false} />);
    await screen.findByRole('button', { name: /PostgreSQL/ });
    expect(screen.queryByLabelText('Skill name')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add skill' })).not.toBeInTheDocument();
  });

  it('records that a person holds the selected skill', async () => {
    const posted = [];
    server({
      skills: [{ id: 'SKL-1', name: 'PostgreSQL' }],
      people: {},
      onPost: (path, opts) => { posted.push([path, opts.body]); return { id: 'PSK-2' }; },
    });
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} />);
    fireEvent.click(await screen.findByRole('button', { name: /PostgreSQL/ }));
    fireEvent.change(await screen.findByLabelText('Person'), { target: { value: 'USR-1' } });
    fireEvent.change(screen.getByLabelText('Proficiency'), { target: { value: 'EXPERT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to person' }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0][0]).toBe('/workspaces/WS-1/people/USR-1/skills');
    expect(posted[0][1]).toEqual({ skillId: 'SKL-1', proficiency: 'EXPERT' });
  });

  /** Every read is workspace-scoped — the panel never asks for a global skill list. */
  it('scopes every request to the active workspace', async () => {
    server({ skills: [{ id: 'SKL-1', name: 'PostgreSQL' }], people: {} });
    render(<SkillsPanel workspaceId="WS-1" members={MEMBERS} />);
    fireEvent.click(await screen.findByRole('button', { name: /PostgreSQL/ }));
    await waitFor(() => expect(api.send.mock.calls.length).toBeGreaterThan(1));
    api.send.mock.calls.forEach(([path]) => expect(path).toMatch(/^\/workspaces\/WS-1\//));
  });

  it('renders nothing without a workspace rather than calling the API', () => {
    const { container } = render(<SkillsPanel workspaceId={null} members={MEMBERS} />);
    expect(api.send).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
