import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButtons } from './export-buttons';

// The server export streams a blob through the single apiClient (CLAUDE.md §3).
const raw = vi.fn();
vi.mock('@/lib/apiClient', () => ({ api: { raw: (...a) => raw(...a) } }));

// PNG capture is client-side (html2canvas); stub the helper so the test stays unit-level.
const exportElementToPng = vi.fn();
vi.mock('@/lib/export', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, exportElementToPng: (...a) => exportElementToPng(...a) };
});

function okBlobResponse() {
  return { ok: true, blob: () => Promise.resolve(new Blob(['x'])) };
}

describe('ExportButtons', () => {
  beforeEach(() => {
    raw.mockReset();
    exportElementToPng.mockReset();
    // jsdom has no real object-URL / anchor click plumbing; stub it.
    window.URL.createObjectURL = vi.fn(() => 'blob:x');
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('PDF button requests the export endpoint with format=pdf', async () => {
    raw.mockResolvedValue(okBlobResponse());
    render(<ExportButtons endpoint="/reports/RPT-1/export" filename="Q3" rows={[]} />);

    await userEvent.click(screen.getByRole('button', { name: 'PDF' }));

    await waitFor(() => expect(raw).toHaveBeenCalledWith('/reports/RPT-1/export?format=pdf'));
  });

  it('Excel button requests the export endpoint with format=xlsx', async () => {
    raw.mockResolvedValue(okBlobResponse());
    render(<ExportButtons endpoint="/dashboards/DSH-1/export" filename="Board" rows={[]} />);

    await userEvent.click(screen.getByRole('button', { name: 'Excel' }));

    await waitFor(() => expect(raw).toHaveBeenCalledWith('/dashboards/DSH-1/export?format=xlsx'));
  });

  it('PNG button captures the target element client-side, not the server', async () => {
    render(<ExportButtons endpoint="/reports/RPT-1/export" targetId="area" filename="Q3" rows={[]} />);

    await userEvent.click(screen.getByRole('button', { name: 'PNG' }));

    await waitFor(() => expect(exportElementToPng).toHaveBeenCalled());
    expect(raw).not.toHaveBeenCalled();
  });

  it('reports an error when the server export fails', async () => {
    raw.mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({ message: 'Forbidden' }) });
    const onError = vi.fn();
    render(<ExportButtons endpoint="/reports/RPT-1/export" filename="Q3" rows={[]} onError={onError} />);

    await userEvent.click(screen.getByRole('button', { name: 'PDF' }));

    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
