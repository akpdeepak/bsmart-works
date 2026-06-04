import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, apiRaw } from './apiClient';

// Builds a fake fetch Response with the given ok/status/json payload.
function fakeResponse({ ok = true, status = 200, body = {}, throwOnJson = false } = {}) {
  return {
    ok,
    status,
    json: throwOnJson
      ? () => Promise.reject(new Error('not json'))
      : () => Promise.resolve(body),
  };
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(fakeResponse());
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

// Returns [url, opts] of the last fetch call.
const lastCall = () => fetchMock.mock.calls.at(-1);

describe('apiRaw — URL handling', () => {
  it('prefixes the API base for relative paths', () => {
    apiRaw('/work-items');
    const [url] = lastCall();
    expect(url).toBe(`${api.base}/work-items`);
  });

  it('leaves absolute http URLs untouched', () => {
    apiRaw('http://elsewhere.test/thing');
    const [url] = lastCall();
    expect(url).toBe('http://elsewhere.test/thing');
  });

  it('defaults to GET', () => {
    apiRaw('/x');
    const [, opts] = lastCall();
    expect(opts.method).toBe('GET');
  });
});

describe('apiRaw — auth header', () => {
  it('omits Authorization when there is no session', () => {
    apiRaw('/x');
    const [, opts] = lastCall();
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it('injects a Bearer token from the persisted session', () => {
    localStorage.setItem('bSmartSession', JSON.stringify({ token: 'abc.def.ghi' }));
    apiRaw('/x');
    const [, opts] = lastCall();
    expect(opts.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('treats a malformed session as no token (does not throw)', () => {
    localStorage.setItem('bSmartSession', '{not json');
    expect(() => apiRaw('/x')).not.toThrow();
    const [, opts] = lastCall();
    expect(opts.headers.Authorization).toBeUndefined();
  });
});

describe('apiRaw — body handling', () => {
  it('sets JSON content-type and serializes object bodies', () => {
    apiRaw('/x', { method: 'POST', body: { a: 1 } });
    const [, opts] = lastCall();
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('does not JSON-encode FormData and omits the JSON content-type', () => {
    const fd = new FormData();
    fd.append('file', 'x');
    apiRaw('/upload', { method: 'POST', formData: fd });
    const [, opts] = lastCall();
    expect(opts.headers['Content-Type']).toBeUndefined();
    expect(opts.body).toBe(fd);
  });

  it('passes string bodies through verbatim', () => {
    apiRaw('/x', { method: 'POST', body: 'raw-string' });
    const [, opts] = lastCall();
    expect(opts.body).toBe('raw-string');
  });
});

describe('api.send — success', () => {
  it('returns parsed JSON on a 2xx response', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ body: { id: 'WRK-1' } }));
    await expect(api.send('/work-items/WRK-1')).resolves.toEqual({ id: 'WRK-1' });
  });
});

describe('api.send — error mapping (CLAUDE.md §3 error shape)', () => {
  it('maps { code, message, field } onto the thrown Error', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({
      ok: false,
      status: 422,
      body: { code: 'VALIDATION', message: 'Title is required', field: 'title' },
    }));

    await expect(api.send('/work-items', { method: 'POST', body: {} }))
      .rejects.toMatchObject({
        message: 'Title is required',
        code: 'VALIDATION',
        field: 'title',
        status: 422,
      });
  });

  it('falls back to an HTTP-status message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ ok: false, status: 500, throwOnJson: true }));

    await expect(api.send('/x')).rejects.toMatchObject({
      message: 'HTTP 500',
      status: 500,
      code: null,
      field: null,
    });
  });
});
