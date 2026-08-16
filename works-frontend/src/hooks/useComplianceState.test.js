import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useComplianceState } from './useComplianceState';

function createApi() {
  return {
    raw: vi.fn().mockResolvedValue({ json: async () => [], blob: async () => new Blob() }),
    send: vi.fn().mockResolvedValue({}),
  };
}

describe('useComplianceState', () => {
  it('scopes compliance reads to the selected workspace', async () => {
    const api = createApi();
    const { result } = renderHook(() => useComplianceState(
      api,
      'WS customer/one',
      vi.fn(),
      vi.fn(),
    ));

    act(() => result.current.fetchComplianceDashboard());

    await waitFor(() => expect(api.send).toHaveBeenCalledWith(
      '/compliance/dashboard?workspaceId=WS%20customer%2Fone',
    ));
  });

  it('writes the selected workspace into new rules', async () => {
    const api = createApi();
    const { result } = renderHook(() => useComplianceState(
      api,
      'WS-tenant-42',
      vi.fn(),
      vi.fn(),
    ));

    act(() => result.current.newRuleBuilder());
    act(() => result.current.setRuleBuilder((current) => ({
      ...current,
      name: 'Required owner',
      assertionBql: 'assignee IS NOT EMPTY',
    })));
    await act(async () => result.current.saveRule());

    expect(api.send).toHaveBeenCalledWith('/compliance/rules', expect.objectContaining({
      method: 'POST',
    }));
    const request = api.send.mock.calls[0][1];
    expect(JSON.parse(request.body).workspaceId).toBe('WS-tenant-42');
  });

  it('does not issue workspace-scoped requests before membership resolution', () => {
    const api = createApi();
    const { result } = renderHook(() => useComplianceState(api, '', vi.fn(), vi.fn()));

    act(() => {
      result.current.fetchComplianceRules();
      result.current.fetchComplianceViolations();
      result.current.fetchComplianceDashboard();
      result.current.fetchComplianceAudit();
      result.current.cloneTemplate('TPL-1');
      result.current.exportComplianceAudit();
    });

    expect(api.send).not.toHaveBeenCalled();
    expect(api.send).not.toHaveBeenCalled();
  });
});
