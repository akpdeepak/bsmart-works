import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useShellOverlays } from './useShellOverlays';

describe('useShellOverlays', () => {
  it('owns shell-level dialog and overlay state outside AppShell', () => {
    const { result } = renderHook(() => useShellOverlays());

    act(() => {
      result.current.setPaletteOpen(true);
      result.current.setOverlay('status');
    });

    expect(result.current.paletteOpen).toBe(true);
    expect(result.current.overlay).toBe('status');
  });
});
