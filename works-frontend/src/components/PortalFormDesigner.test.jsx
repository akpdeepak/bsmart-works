import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortalFormDesigner } from './PortalFormDesigner';

// ── Mock apiClient ─────────────────────────────────────────────────────────────
const mockSend = vi.fn();
vi.mock('@/lib/apiClient', () => ({ api: { send: (...args) => mockSend(...args) } }));

const REQUEST_TYPE_ID = 'RT-001';

function setup(schema = []) {
  mockSend.mockResolvedValue({ formSchema: schema });
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <PortalFormDesigner
      requestTypeId={REQUEST_TYPE_ID}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
  return { onClose, onSaved };
}

describe('PortalFormDesigner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the toolbar with Save and Preview buttons', async () => {
    setup();
    await waitFor(() => expect(screen.queryByRole('region', { name: /loading/i })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
  });

  it('shows a skeleton while the schema is loading', () => {
    // Keep the promise pending so loading stays visible
    mockSend.mockReturnValue(new Promise(() => {}));
    render(
      <PortalFormDesigner requestTypeId={REQUEST_TYPE_ID} onClose={vi.fn()} />
    );
    expect(screen.getByRole('region', { name: /loading form schema/i })).toBeInTheDocument();
  });

  it('adding a Text field from the palette adds it to the canvas', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(screen.queryByRole('region', { name: /loading/i })).not.toBeInTheDocument());

    // Click "Text" in the palette
    await user.click(screen.getByRole('button', { name: /^text$/i }));

    // A field card should appear on the canvas
    const canvas = screen.getByRole('list', { name: /form canvas/i });
    expect(canvas.querySelectorAll('[role="listitem"]').length).toBe(1);
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('removing a field removes it from the canvas', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(screen.queryByRole('region', { name: /loading/i })).not.toBeInTheDocument());

    // Add a field first
    await user.click(screen.getByRole('button', { name: /^text$/i }));
    const canvas = screen.getByRole('list', { name: /form canvas/i });
    expect(canvas.querySelectorAll('[role="listitem"]').length).toBe(1);

    // Remove it
    await user.click(screen.getByRole('button', { name: /remove field/i }));
    expect(canvas.querySelectorAll('[role="listitem"]').length).toBe(0);
  });

  it('reordering via Move down produces the correct array order', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(screen.queryByRole('region', { name: /loading/i })).not.toBeInTheDocument());

    // Add two fields
    await user.click(screen.getByRole('button', { name: /^text$/i }));
    await user.click(screen.getByRole('button', { name: /^number$/i }));

    // Labels: first card should be "Text", second "Number"
    const cards = screen.getAllByRole('article');
    expect(cards[0]).toHaveTextContent('Text');
    expect(cards[1]).toHaveTextContent('Number');

    // Move Text field down — first "Move field down" button belongs to first card
    const moveDownBtns = screen.getAllByRole('button', { name: /move field down/i });
    await user.click(moveDownBtns[0]);

    const reordered = screen.getAllByRole('article');
    expect(reordered[0]).toHaveTextContent('Number');
    expect(reordered[1]).toHaveTextContent('Text');
  });

  it('Save button calls PUT with the correct schema shape', async () => {
    const user = userEvent.setup();
    const { onSaved, onClose } = setup();
    await waitFor(() => expect(screen.queryByRole('region', { name: /loading/i })).not.toBeInTheDocument());

    // Add a field
    await user.click(screen.getByRole('button', { name: /^text$/i }));

    // Reset mock for the save call
    mockSend.mockResolvedValue({});

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const [path, opts] = mockSend.mock.calls[mockSend.mock.calls.length - 1];
      expect(path).toBe(`/service/request-types/${REQUEST_TYPE_ID}`);
      expect(opts.method).toBe('PUT');
      expect(opts.body.formSchema).toHaveLength(1);
      const field = opts.body.formSchema[0];
      expect(field).toMatchObject({
        type: 'text',
        label: expect.any(String),
        required: expect.any(Boolean),
      });
    });

    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('Preview mode renders the form fields in read-only state', async () => {
    const user = userEvent.setup();
    // Start with a schema pre-loaded
    const schema = [
      { id: 'f1', type: 'text', label: 'Full name', placeholder: 'e.g. Asha', required: true, helpText: '', options: [], showIf: null },
      { id: 'f2', type: 'dropdown', label: 'Priority', placeholder: '', required: false, helpText: '', options: ['Low', 'High'], showIf: null },
    ];
    mockSend.mockResolvedValue({ formSchema: schema });
    render(<PortalFormDesigner requestTypeId={REQUEST_TYPE_ID} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.queryByRole('region', { name: /loading/i })).not.toBeInTheDocument());

    // Switch to Preview
    await user.click(screen.getByRole('button', { name: /preview/i }));

    const preview = screen.getByRole('region', { name: /form preview/i });
    expect(preview).toBeInTheDocument();

    // Field labels appear
    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();

    // Inputs should be disabled
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((inp) => expect(inp).toBeDisabled());
  });

  it('loads an existing schema and displays pre-existing fields', async () => {
    const schema = [
      { id: 'existing-1', type: 'textarea', label: 'Description', placeholder: '', required: false, helpText: '', options: [], showIf: null },
    ];
    mockSend.mockResolvedValue({ formSchema: schema });
    render(<PortalFormDesigner requestTypeId={REQUEST_TYPE_ID} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Description')).toBeInTheDocument());
    const canvas = screen.getByRole('list', { name: /form canvas/i });
    expect(canvas.querySelectorAll('[role="listitem"]').length).toBe(1);
  });
});
