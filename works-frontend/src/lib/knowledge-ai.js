// bSmart Works — Know Studio AI client. Every call goes through the single apiClient (CLAUDE.md §3);
// this module shapes the Know AI endpoints. The backend applies the AI Control Plane (scope / budget
// / cache / audit) and a deterministic fallback (RB-40 §2), so the editor always gets usable text —
// `meta.fallback` says whether AI actually ran. `ask` reuses the existing KB RAG endpoint.

import { api } from '@/lib/apiClient';
import { aiClient } from '@/lib/ai';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const knowledgeAi = {
  // mode ∈ write | improve | expand | summarize | shorten. Returns { mode, text, meta }.
  compose: (workspaceId, { mode, text, instruction }) =>
    api.send(`/knowledge/ai/compose?workspaceId=${ws(workspaceId)}`, {
      method: 'POST',
      body: { mode, text, instruction },
    }),
  // Ask the knowledge base (RAG). Returns { answer, citations, meta }.
  ask: (workspaceId, question) => aiClient.kbAsk(workspaceId, question),
};

// Build the `aiAssist` callback the BlockEditor expects: ({ mode, text, instruction }) → { text, meta }.
// Returns null when knowledge generation is not enabled for the workspace, so the editor hides its
// AI affordances entirely (most-restrictive-wins is resolved server-side, RB-40 §2).
export function makeAiAssist(workspaceId, enabled) {
  if (!workspaceId || !enabled) return null;
  return async ({ mode, text, instruction }) => {
    const res = await knowledgeAi.compose(workspaceId, { mode, text, instruction });
    return { text: res.text, meta: res.meta };
  };
}
