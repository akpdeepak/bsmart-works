import re

with open('src/views/settings3/field-settings.jsx', 'r') as f:
    content = f.read()

div_start = """                        <div key={fd.id}
                          draggable={true}
                          onDragStart={() => { fieldDragIdx.current = idx; }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => {
                            const from = fieldDragIdx.current;
                            if (from === null || from === idx) return;
                            const order = getLayoutOrder(itemType).slice();
                            const [moved] = order.splice(from, 1);
                            order.splice(idx, 0, moved);
                            setLayoutOrders(prev => ({ ...prev, [itemType]: order }));
                            fieldDragIdx.current = null;
                          }}
                          className="flex items-center gap-3 py-2 px-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg cursor-grab active:opacity-60">"""

new_div_start = """                        <div key={fd.id}
                          draggable={true}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                              e.preventDefault();
                              const order = getLayoutOrder(itemType).slice();
                              const targetIdx = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
                              if (targetIdx >= 0 && targetIdx < order.length) {
                                const [moved] = order.splice(idx, 1);
                                order.splice(targetIdx, 0, moved);
                                setLayoutOrders(prev => ({ ...prev, [itemType]: order }));
                              }
                            }
                          }}
                          onDragStart={() => { fieldDragIdx.current = idx; }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => {
                            const from = fieldDragIdx.current;
                            if (from === null || from === idx) return;
                            const order = getLayoutOrder(itemType).slice();
                            const [moved] = order.splice(from, 1);
                            order.splice(idx, 0, moved);
                            setLayoutOrders(prev => ({ ...prev, [itemType]: order }));
                            fieldDragIdx.current = null;
                          }}
                          className="flex items-center gap-3 py-2 px-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg cursor-grab active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">"""

content = content.replace(div_start, new_div_start)

with open('src/views/settings3/field-settings.jsx', 'w') as f:
    f.write(content)
