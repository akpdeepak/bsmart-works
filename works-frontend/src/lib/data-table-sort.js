export function nextSortModel(model = [], key, additive = false) {
  const existing = model.find((sort) => sort.key === key);
  if (!additive) {
    if (!existing) return [{ key, dir: 'asc' }];
    if (existing.dir === 'asc') return [{ key, dir: 'desc' }];
    return [];
  }
  if (!existing) return [...model, { key, dir: 'asc' }];
  if (existing.dir === 'asc') return model.map((sort) => (sort.key === key ? { ...sort, dir: 'desc' } : sort));
  return model.filter((sort) => sort.key !== key);
}

export function sortPriority(model = [], key) {
  const index = model.findIndex((sort) => sort.key === key);
  return index === -1 ? 0 : index + 1;
}

export function sortDirOf(model = [], key) {
  return model.find((sort) => sort.key === key)?.dir ?? null;
}

export function moveColumn(order = [], key, delta) {
  const index = order.indexOf(key);
  const nextIndex = index + delta;
  if (index === -1 || nextIndex < 0 || nextIndex >= order.length) return order;
  const next = [...order];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}
