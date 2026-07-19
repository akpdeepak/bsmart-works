const PREFIX = 'bsmart.today.attention.v1';
export const TODAY_ATTENTION_LIMIT = 5;

export function todayAttentionKey(workspaceId, userId, role) {
  return `${PREFIX}:${workspaceId || 'none'}:${userId || 'anonymous'}:${role || 'developer'}`;
}

export function attentionFingerprint(item) {
  return [item?.id, item?.title, item?.reason].map((value) => String(value || '')).join('|');
}

export function readTodayAttention(key, storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(key) || 'null');
    return {
      dismissed: Array.isArray(value?.dismissed) ? value.dismissed : [],
      snoozed: value?.snoozed && typeof value.snoozed === 'object' ? value.snoozed : {},
      seen: Array.isArray(value?.seen) ? value.seen : [],
      lastVisitAt: value?.lastVisitAt || null,
    };
  } catch {
    return { dismissed: [], snoozed: {}, seen: [], lastVisitAt: null };
  }
}

export function writeTodayAttention(key, state, storage = globalThis.localStorage) {
  storage?.setItem(key, JSON.stringify(state));
}

export function visibleTodayAttention(items, state, now = new Date()) {
  const dismissed = new Set(state.dismissed || []);
  const seen = new Set(state.seen || []);
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return (items || []).filter((item) => {
    const key = attentionFingerprint(item);
    if (dismissed.has(key)) return false;
    const until = state.snoozed?.[key];
    return !until || new Date(until).getTime() <= nowMs;
  }).slice(0, TODAY_ATTENTION_LIMIT).map((item) => {
    const attentionKey = attentionFingerprint(item);
    return { ...item, attentionKey, isNew: Boolean(state.lastVisitAt) && !seen.has(attentionKey) };
  });
}

export function dismissTodayAttention(state, item) {
  const key = item.attentionKey || attentionFingerprint(item);
  return { ...state, dismissed: [...new Set([...(state.dismissed || []), key])] };
}

export function snoozeTodayAttention(state, item, until) {
  const key = item.attentionKey || attentionFingerprint(item);
  return { ...state, snoozed: { ...(state.snoozed || {}), [key]: new Date(until).toISOString() } };
}

export function snapshotTodayAttention(state, items, visitedAt = new Date()) {
  return {
    ...state,
    seen: (items || []).map(attentionFingerprint),
    lastVisitAt: new Date(visitedAt).toISOString(),
  };
}
