import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/apiClient';
import { knowledgeAi, makeAiAssist } from '@/lib/knowledge-ai';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

describe('knowledgeAi.compose', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts mode/text/instruction to the workspace-scoped compose endpoint', async () => {
    api.send.mockResolvedValue({ mode: 'improve', text: 'Better.', meta: { fallback: false } });
    const res = await knowledgeAi.compose('ws-1', { mode: 'improve', text: 'better', instruction: '' });
    expect(api.send).toHaveBeenCalledWith(
      '/knowledge/ai/compose?workspaceId=ws-1',
      { method: 'POST', body: { mode: 'improve', text: 'better', instruction: '' } },
    );
    expect(res.text).toBe('Better.');
  });
});

describe('makeAiAssist', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no workspace or capability disabled (AI affordances hidden)', () => {
    expect(makeAiAssist(null, true)).toBeNull();
    expect(makeAiAssist('ws-1', false)).toBeNull();
  });

  it('returns a callback that composes and maps to { text, meta }', async () => {
    api.send.mockResolvedValue({ mode: 'write', text: 'Drafted.', meta: { fallback: true, tier: 'NONE' } });
    const assist = makeAiAssist('ws-1', true);
    const out = await assist({ mode: 'write', instruction: 'intro' });
    expect(out).toEqual({ text: 'Drafted.', meta: { fallback: true, tier: 'NONE' } });
  });
});
