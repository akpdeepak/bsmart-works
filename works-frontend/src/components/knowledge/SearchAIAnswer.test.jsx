import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchAIAnswer } from '@/components/knowledge/SearchAIAnswer';

const CITATIONS = [
  { id: 'ART-1', title: 'Rollback runbook', excerpt: 'To roll back, deploy the previous tag.' },
  { id: 'ART-2', title: 'Incident playbook' },
];

const META_AI = { fallback: false, tier: 'SONNET', cacheHit: false, policyState: 'ENABLED' };
const META_FALLBACK = { fallback: true, tier: 'NONE', cacheHit: false };

describe('SearchAIAnswer', () => {
  it('renders the answer text', () => {
    render(<SearchAIAnswer answer="Deploy the previous release tag." citations={[]} meta={META_AI} />);
    expect(screen.getByText('Deploy the previous release tag.')).toBeInTheDocument();
  });

  it('renders citation cards for each source', () => {
    render(<SearchAIAnswer answer="Answer" citations={CITATIONS} meta={META_AI} />);
    expect(screen.getByRole('button', { name: 'Rollback runbook' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Incident playbook' })).toBeInTheDocument();
  });

  it('renders the excerpt snippet inside a citation card', () => {
    render(<SearchAIAnswer answer="Answer" citations={CITATIONS} meta={META_AI} />);
    expect(screen.getByText('To roll back, deploy the previous tag.')).toBeInTheDocument();
  });

  it('calls onOpenArticle with the article id when a citation is clicked', async () => {
    const onOpenArticle = vi.fn();
    const user = userEvent.setup();
    render(<SearchAIAnswer answer="A" citations={CITATIONS} meta={META_AI} onOpenArticle={onOpenArticle} />);
    await user.click(screen.getByRole('button', { name: 'Rollback runbook' }));
    expect(onOpenArticle).toHaveBeenCalledWith('ART-1');
  });

  it('renders AiMetaBadge with AI tier label when AI ran', () => {
    render(<SearchAIAnswer answer="A" citations={[]} meta={META_AI} />);
    expect(screen.getByText(/AI · SONNET/)).toBeInTheDocument();
  });

  it('shows fallback banner when meta.fallback is true', () => {
    render(<SearchAIAnswer answer="Keyword match" citations={[]} meta={META_FALLBACK} />);
    expect(screen.getByText('AI unavailable — keyword results shown instead')).toBeInTheDocument();
  });

  it('shows fallback banner when meta.source is keyword_fallback', () => {
    render(
      <SearchAIAnswer
        answer="Keyword match"
        citations={[]}
        meta={{ fallback: false, source: 'keyword_fallback', tier: 'NONE' }}
      />
    );
    expect(screen.getByText('AI unavailable — keyword results shown instead')).toBeInTheDocument();
  });

  it('does not show fallback banner when AI ran successfully', () => {
    render(<SearchAIAnswer answer="Answer" citations={[]} meta={META_AI} />);
    expect(screen.queryByText(/AI unavailable/)).not.toBeInTheDocument();
  });

  it('renders nothing when answer is falsy', () => {
    const { container } = render(<SearchAIAnswer answer="" citations={[]} meta={META_AI} />);
    expect(container.firstChild).toBeNull();
  });
});
