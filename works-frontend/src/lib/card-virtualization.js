const ESTIMATED_CARD_HEIGHT = {
  compact: 104,
  comfortable: 136,
  spacious: 168,
};

export function estimateCardHeight(density = 'comfortable') {
  return ESTIMATED_CARD_HEIGHT[density] ?? ESTIMATED_CARD_HEIGHT.comfortable;
}
