// bSmart Works — AI-native UX assist client (WI-27, RB-40 §2).
//
// Every method documents its deterministic fallback — the UI path taken when AI is
// off, over-budget, or unavailable. "No fallback documented = it does not ship" (RB-40 §2).
//
// All HTTP goes through the single `api` wrapper (RB-10 §1; no inline fetch/axios).
// The backend applies scope / budget / cache / audit; this module shapes the endpoints.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

/**
 * AI assist API client — every call has a documented fallback.
 *
 * Fallback contract: if AI is off / over-budget / unavailable, the caller receives
 * { result: null, fallback: true } (or { nudges: [], fallback: true }) and MUST render
 * the deterministic fallback UI. The manual field / section is always present in the DOM
 * — AI merely augments it; it never replaces it.
 */
export const aiAssistClient = {
  /**
   * Suggest a description for a work item given its title and type.
   *
   * Fallback: returns { result: null, fallback: true }
   * → caller shows the manual description textarea (always present in the detail panel).
   *
   * @param {string} workspaceId
   * @param {{ title: string, type: string }} params
   * @returns {Promise<{ result: string|null, fallback: boolean }>}
   */
  async suggestDescription(workspaceId, { title, type }) {
    try {
      return await api.send(`/ai/assist/suggest-description?workspaceId=${ws(workspaceId)}`, {
        method: 'POST',
        body: { title, type },
      });
    } catch {
      return { result: null, fallback: true };
    }
  },

  /**
   * Stream-complete a field value (title, description, acceptance criteria) via SSE.
   * Returns an EventSource for token-streaming, or null when streaming is unavailable.
   *
   * Fallback: null → caller shows the static textarea (always present); no streaming cursor.
   * The caller must call .close() on the returned EventSource when done or unmounting.
   *
   * @param {string} workspaceId
   * @param {{ prompt: string, field: string }} params
   * @returns {EventSource|null}
   */
  streamComplete(workspaceId, { prompt, field }) {
    try {
      const params = new URLSearchParams({
        workspaceId: String(workspaceId),
        prompt,
        field,
      });
      // Auth token is injected via a query parameter because EventSource does not support
      // custom request headers. The backend reads the token from the `token` query param
      // when an Authorization header is absent.
      const token = (() => {
        try {
          return JSON.parse(localStorage.getItem('bSmartSession') || 'null')?.token || '';
        } catch {
          return '';
        }
      })();
      if (token) params.set('token', token);
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
      return new EventSource(`${apiBase}/ai/assist/stream?${params}`);
    } catch {
      return null;
    }
  },

  /**
   * Get proactive nudges for the Today dashboard.
   *
   * Fallback: a deterministic, workspace-scoped summary with fallback metadata. The Today
   * surface renders it honestly and keeps the manual dashboard available.
   *
   * @param {string} workspaceId
   * @returns {Promise<{ summary: string, nudges: Array<{ text: string, workItemId: string, title: string }>, fallback: boolean, meta: object }>}
   */
  async getTodayNudges(workspaceId) {
    try {
      return await api.send(`/ai/today-nudges?workspaceId=${ws(workspaceId)}`);
    } catch {
      return {
        summary: 'AI is unavailable. Use the workspace-scoped priorities below as your daily brief.',
        nudges: [],
        fallback: true,
        meta: { fallback: true },
      };
    }
  },
};
