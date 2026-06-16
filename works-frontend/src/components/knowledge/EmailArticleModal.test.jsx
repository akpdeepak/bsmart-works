import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailArticleModal } from './EmailArticleModal';
import * as apiClient from '@/lib/apiClient';
import * as toastQueue from '@/lib/toast-queue';

vi.mock('@/lib/apiClient', () => ({
  api: { send: vi.fn() },
}));

vi.mock('@/lib/toast-queue', () => ({
  pushToast: vi.fn(),
}));

function renderModal(overrides = {}) {
  const defaults = {
    articleId: 'ART-001',
    articleTitle: 'Test Article',
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<EmailArticleModal {...defaults} />), props: defaults };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EmailArticleModal (KR-084)', () => {
  it('renders the modal with title', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: /send article by email/i })).toBeTruthy();
    expect(screen.getByText(/send article by email/i)).toBeTruthy();
  });

  it('pre-fills subject with article title', () => {
    renderModal();
    const subjectInput = screen.getByRole('textbox', { name: /subject/i });
    expect(subjectInput.value).toBe('Test Article');
  });

  it('shows recipients count', () => {
    renderModal();
    // Initially 0 recipients
    expect(screen.getByText(/0\/10 recipients/i)).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /close email modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error when recipients field is empty on submit', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /send email/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText(/at least one recipient/i)).toBeTruthy();
    });
  });

  it('shows error for more than 10 recipients', async () => {
    renderModal();
    const textarea = screen.getByPlaceholderText(/name@example.com/i);
    const manyEmails = Array.from({ length: 11 }, (_, i) => `user${i}@test.com`).join(', ');
    fireEvent.change(textarea, { target: { value: manyEmails } });
    fireEvent.click(screen.getByRole('button', { name: /send email/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText(/maximum 10 recipients/i)).toBeTruthy();
    });
  });

  it('shows error for invalid email address', async () => {
    renderModal();
    const textarea = screen.getByPlaceholderText(/name@example.com/i);
    fireEvent.change(textarea, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /send email/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText(/invalid email/i)).toBeTruthy();
    });
  });

  it('submits successfully with valid recipient', async () => {
    apiClient.api.send.mockResolvedValueOnce({ sent: true, recipientCount: 1 });
    const onClose = vi.fn();
    renderModal({ onClose });

    const textarea = screen.getByPlaceholderText(/name@example.com/i);
    fireEvent.change(textarea, { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send email/i }));

    await waitFor(() => {
      expect(apiClient.api.send).toHaveBeenCalledWith(
        '/articles/ART-001/send-email',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            recipients: ['user@example.com'],
          }),
        }),
      );
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastQueue.pushToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'success' }),
    );
  });

  it('shows error message when API call fails', async () => {
    apiClient.api.send.mockRejectedValueOnce(new Error('Server error'));
    renderModal();

    const textarea = screen.getByPlaceholderText(/name@example.com/i);
    fireEvent.change(textarea, { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send email/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText(/server error/i)).toBeTruthy();
    });
  });

  it('updates recipients count as user types', () => {
    renderModal();
    const textarea = screen.getByPlaceholderText(/name@example.com/i);
    fireEvent.change(textarea, { target: { value: 'a@b.com, c@d.com' } });
    expect(screen.getByText(/2\/10 recipients/i)).toBeTruthy();
  });

  it('shows message character count', () => {
    renderModal();
    const msgTextarea = screen.getByPlaceholderText(/personal note/i);
    fireEvent.change(msgTextarea, { target: { value: 'Hello' } });
    expect(screen.getByText(/5\/500/)).toBeTruthy();
  });
});
