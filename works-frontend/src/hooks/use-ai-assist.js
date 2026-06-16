// bSmart Works — AI assist hook (WI-27).
//
// Manages the three async states for AI-assist interactions:
//   • suggesting — a single-shot description suggestion is in-flight
//   • streaming  — a token-stream is open (EventSource / SSE)
//   • fallback   — AI is off / over-budget / unavailable; caller shows static UI
//
// Every surface that uses this hook must render the manual field regardless of AI state
// (the field is the fallback). AI merely augments; it never replaces the manual path.
// RB-40 §2: "No fallback documented = it does not ship."

import { useState, useCallback, useRef, useEffect } from 'react';
import { aiAssistClient } from '@/lib/ai-assist';

/**
 * @param {string} workspaceId
 * @returns {{
 *   suggesting: boolean,
 *   streaming: boolean,
 *   streamedText: string,
 *   fallback: boolean,
 *   suggestDescription: (params: { title: string, type: string }) => Promise<string|null>,
 *   startStream: (params: { prompt: string, field: string }, onToken?: (t: string) => void, onDone?: () => void) => void,
 * }}
 */
export function useAiAssist(workspaceId) {
  const [suggesting, setSuggesting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [fallback, setFallback] = useState(false);
  // Keep a ref to the active EventSource so we can close it on unmount or re-stream.
  const esRef = useRef(null);

  /**
   * Request a one-shot description suggestion.
   * Returns the suggested string, or null when AI falls back.
   * Sets fallback=true so the button can hide/disable itself.
   */
  const suggestDescription = useCallback(
    async (params) => {
      setSuggesting(true);
      setFallback(false);
      try {
        const res = await aiAssistClient.suggestDescription(workspaceId, params);
        if (res?.fallback) {
          setFallback(true);
          return null;
        }
        return res?.result ?? null;
      } finally {
        setSuggesting(false);
      }
    },
    [workspaceId]
  );

  /**
   * Open an SSE stream for a field completion.
   * Tokens accumulate in streamedText; onToken fires per-token; onDone fires at [DONE].
   * Falls back silently if the EventSource can't be created (AI off / unavailable).
   *
   * @param {{ prompt: string, field: string }} params
   * @param {(token: string) => void} [onToken]
   * @param {() => void} [onDone]
   */
  const startStream = useCallback(
    (params, onToken, onDone) => {
      // Close any existing stream before opening a new one.
      esRef.current?.close();
      setStreamedText('');
      setStreaming(true);
      setFallback(false);

      const es = aiAssistClient.streamComplete(workspaceId, params);
      if (!es) {
        // streamComplete returned null — AI is off or unavailable.
        setStreaming(false);
        setFallback(true);
        onDone?.();
        return;
      }

      esRef.current = es;

      es.onmessage = (evt) => {
        if (evt.data === '[DONE]') {
          setStreaming(false);
          onDone?.();
          es.close();
          return;
        }
        setStreamedText((t) => t + evt.data);
        onToken?.(evt.data);
      };

      es.onerror = () => {
        setStreaming(false);
        setFallback(true);
        es.close();
      };
    },
    [workspaceId]
  );

  // Clean up any open EventSource on unmount so we don't leak connections.
  useEffect(() => () => esRef.current?.close(), []);

  return { suggesting, streaming, streamedText, fallback, suggestDescription, startStream };
}
