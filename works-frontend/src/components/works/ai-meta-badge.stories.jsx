import { AiMetaBadge } from './ai-meta-badge';

export default {
  title: 'Works/AiMetaBadge',
  component: AiMetaBadge,
  tags: ['autodocs'],
  args: {
    narrative: 'Sprint health looks good — 78% velocity vs target.',
  },
};

// AI ran successfully using the capable (Sonnet) tier
export const AiOnSonnet = {
  name: 'AI on — Sonnet tier',
  args: {
    meta: { fallback: false, cacheHit: false, tier: 'sonnet', policyState: 'ACTIVE' },
  },
};

// AI ran on the degraded (cheaper) Haiku tier because spend was ≥80%
export const AiOnHaikuDegraded = {
  name: 'AI on — degraded to Haiku',
  args: {
    meta: { fallback: false, cacheHit: false, tier: 'haiku', policyState: 'DEGRADED' },
  },
};

// Response was served from the cache — no new model call
export const CacheHit = {
  name: 'AI cached response',
  args: {
    meta: { fallback: false, cacheHit: true, tier: 'sonnet', policyState: 'ACTIVE' },
  },
};

// AI is off/over budget — deterministic fallback result displayed
export const DeterministicFallback = {
  name: 'Deterministic fallback (AI off)',
  args: {
    meta: { fallback: true, cacheHit: false, tier: null, policyState: 'DISABLED' },
    narrative: 'Showing rule-based analysis — AI is currently disabled for this workspace.',
  },
};

// No meta at all — component renders nothing (null check)
export const NoMeta = {
  name: 'No meta (renders nothing)',
  args: { meta: null, narrative: 'This should not appear.' },
};

// Without an explanatory narrative
export const WithoutNarrative = {
  name: 'Without narrative',
  args: {
    meta: { fallback: false, cacheHit: false, tier: 'haiku', policyState: 'ACTIVE' },
    narrative: undefined,
  },
};
