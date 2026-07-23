import { describe, it, expect, vi, beforeEach } from 'vitest';
import { internalChatClient } from './internalChat';
import { api } from './apiClient';

vi.mock('./apiClient', () => ({ api: { send: vi.fn(() => Promise.resolve({})) } }));

/**
 * The EPIC-9 internal-messaging client — the surface the Messenger view actually calls, and the
 * one kept as canonical when the orphan phase4 `/messenger` backend was retired (GH-522).
 *
 * It called `api.get` / `api.post`, which the single API client has never exported (it exposes
 * `raw` and `send` only), and it prefixed paths with `/api/v1` although `apiClient` already bakes
 * that into the base URL. Either fault alone breaks every call, so these pin both.
 */
describe('internalChatClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses only methods the API client exports', () => {
    Object.values(internalChatClient).forEach((fn) => fn('WS-1', 'CONV-1', 'hi'));
    expect(api.send).toHaveBeenCalledTimes(Object.keys(internalChatClient).length);
  });

  it('sends API-relative paths so the base URL is not doubled', () => {
    internalChatClient.listConversations('WS-1');
    internalChatClient.getConversation('WS-1', 'CONV-1');
    api.send.mock.calls.forEach(([path]) => {
      expect(path).not.toMatch(/\/api\/v1/);
      expect(path.startsWith('/internal-messaging/')).toBe(true);
    });
  });

  it('scopes conversation reads to the workspace', () => {
    internalChatClient.listConversations('WS-1');
    expect(api.send).toHaveBeenCalledWith('/internal-messaging/conversations?workspaceId=WS-1');
  });

  it('posts a new conversation with its payload', () => {
    internalChatClient.createConversation('WS-1', { title: 'Release plan' });
    expect(api.send).toHaveBeenCalledWith(
      '/internal-messaging/conversations?workspaceId=WS-1',
      { method: 'POST', body: { title: 'Release plan' } },
    );
  });

  it('posts a message body to the conversation', () => {
    internalChatClient.sendMessage('WS-1', 'CONV-1', 'ship it');
    expect(api.send).toHaveBeenCalledWith(
      '/internal-messaging/conversations/CONV-1/messages?workspaceId=WS-1',
      { method: 'POST', body: { body: 'ship it' } },
    );
  });

  it('encodes ids and workspace ids that contain URL-significant characters', () => {
    internalChatClient.getConversation('WS 1&x', 'CONV/1');
    expect(api.send).toHaveBeenCalledWith(
      '/internal-messaging/conversations/CONV%2F1?workspaceId=WS%201%26x',
    );
  });
});
