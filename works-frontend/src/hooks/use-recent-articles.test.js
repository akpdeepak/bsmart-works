// KR-036 — useRecentArticles hook tests.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentArticles } from './use-recent-articles';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

const WS = 'WS-1';
const USER = 'U-1';
const art = (n) => ({ id: `ART-${n}`, title: `Article ${n}` });

describe('useRecentArticles (KR-036)', () => {
  it('starts with an empty list when nothing is stored', () => {
    const { result } = renderHook(() => useRecentArticles(WS, USER));
    expect(result.current[0]).toEqual([]);
  });

  it('addRecent x3 — newest is first', () => {
    const { result } = renderHook(() => useRecentArticles(WS, USER));
    act(() => result.current[1](art(1)));
    act(() => result.current[1](art(2)));
    act(() => result.current[1](art(3)));
    const [recent] = result.current;
    expect(recent[0].id).toBe('ART-3');
    expect(recent[1].id).toBe('ART-2');
    expect(recent[2].id).toBe('ART-1');
  });

  it('deduplicates: re-adding an existing article moves it to the front', () => {
    const { result } = renderHook(() => useRecentArticles(WS, USER));
    act(() => result.current[1](art(1)));
    act(() => result.current[1](art(2)));
    act(() => result.current[1](art(1))); // re-add ART-1
    const [recent] = result.current;
    expect(recent.length).toBe(2);
    expect(recent[0].id).toBe('ART-1');
    expect(recent[1].id).toBe('ART-2');
  });

  it('caps the list at 10 entries', () => {
    const { result } = renderHook(() => useRecentArticles(WS, USER));
    for (let i = 1; i <= 12; i++) {
      act(() => result.current[1](art(i)));
    }
    expect(result.current[0].length).toBe(10);
    expect(result.current[0][0].id).toBe('ART-12'); // newest first
  });

  it('clearAll empties the list and localStorage', () => {
    const { result } = renderHook(() => useRecentArticles(WS, USER));
    act(() => result.current[1](art(1)));
    act(() => result.current[2]()); // clearAll
    expect(result.current[0]).toEqual([]);
    const stored = localStorage.getItem(`know_recent_${WS}_${USER}`);
    expect(JSON.parse(stored)).toEqual([]);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useRecentArticles(WS, USER));
    act(() => result.current[1](art(1)));
    act(() => result.current[1](art(2)));
    const stored = JSON.parse(localStorage.getItem(`know_recent_${WS}_${USER}`));
    expect(stored.length).toBe(2);
    expect(stored[0].id).toBe('ART-2');
  });

  it('restores from localStorage on mount', () => {
    localStorage.setItem(`know_recent_${WS}_${USER}`, JSON.stringify([art(5), art(6)]));
    const { result } = renderHook(() => useRecentArticles(WS, USER));
    expect(result.current[0][0].id).toBe('ART-5');
    expect(result.current[0][1].id).toBe('ART-6');
  });

  it('does nothing when article has no id', () => {
    const { result } = renderHook(() => useRecentArticles(WS, USER));
    act(() => result.current[1]({ title: 'no id' }));
    expect(result.current[0]).toEqual([]);
  });
});
