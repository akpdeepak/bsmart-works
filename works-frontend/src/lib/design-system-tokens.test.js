import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '..');
const frontendRoot = resolve(srcRoot, '..');

function read(relativePath) {
  return readFileSync(resolve(frontendRoot, relativePath), 'utf8');
}

describe('brand-tokens JS module', () => {
  it('exports all tailwind.config.js brand colours', () => {
    const tokens = read('src/lib/brand-tokens.js');
    const config = read('tailwind.config.js');

    // Every colour defined in tailwind.config.js should have a corresponding export
    expect(tokens).toContain("BRAND_NAVY   = '#0B2F5C'");
    expect(tokens).toContain("BRAND_NAVY_TINT = '#1E4D8C'");
    expect(tokens).toContain("BRAND_ORANGE = '#E94E1B'");
    expect(tokens).toContain("BRAND_AMBER  = '#F39200'");

    // Verify the values match the config
    for (const hex of ['#0B2F5C', '#1E4D8C', '#E94E1B', '#F39200']) {
      expect(config).toContain(hex);
      expect(tokens).toContain(hex);
    }
  });

  it('exports semantic status colours matching tailwind config', () => {
    const tokens = read('src/lib/brand-tokens.js');
    for (const hex of ['#0E7C5E', '#E8F3EE', '#B97A00', '#FFF4E5', '#C0392B', '#FDE7E7', '#1E4D8C', '#E5EDF7']) {
      expect(tokens).toContain(hex);
    }
  });

  it('exports full neutral palette (50–900)', () => {
    const tokens = read('src/lib/brand-tokens.js');
    for (const key of ['NEUTRAL_50', 'NEUTRAL_100', 'NEUTRAL_200', 'NEUTRAL_300', 'NEUTRAL_400',
                        'NEUTRAL_500', 'NEUTRAL_600', 'NEUTRAL_700', 'NEUTRAL_800', 'NEUTRAL_900']) {
      expect(tokens).toContain(`export const ${key}`);
    }
  });

  it('exports elevation shadow tokens', () => {
    const tokens = read('src/lib/brand-tokens.js');
    for (const key of ['SHADOW_SM', 'SHADOW_MD', 'SHADOW_LG', 'SHADOW_XL']) {
      expect(tokens).toContain(`export const ${key}`);
    }
  });

  it('exports focus ring tokens', () => {
    const tokens = read('src/lib/brand-tokens.js');
    expect(tokens).toContain('FOCUS_RING_WIDTH');
    expect(tokens).toContain('FOCUS_RING_OFFSET');
    expect(tokens).toContain('FOCUS_RING_COLOR');
  });

  it('exports work-item status category colours', () => {
    const tokens = read('src/lib/brand-tokens.js');
    expect(tokens).toContain('STATUS_TODO');
    expect(tokens).toContain('STATUS_IN_PROGRESS');
    expect(tokens).toContain('STATUS_DONE');
  });
});

describe('design-system CSS tokens', () => {
  it('defines density custom properties for all three levels', () => {
    const css = read('src/index.css');
    expect(css).toContain('[data-density="comfortable"]');
    expect(css).toContain('[data-density="compact"]');
    expect(css).toContain('[data-density="spacious"]');
    expect(css).toContain('--dp-card:');
    expect(css).toContain('--dp-gap:');
    expect(css).toContain('--dp-row-y:');
  });

  it('defines focus-ring custom properties', () => {
    const css = read('src/index.css');
    expect(css).toContain('--focus-ring-width:');
    expect(css).toContain('--focus-ring-offset:');
    expect(css).toContain('--focus-ring-color:');
  });

  it('defines a reusable .focus-ring utility class', () => {
    const css = read('src/index.css');
    expect(css).toContain('.focus-ring:focus-visible');
  });

  it('respects prefers-reduced-motion globally', () => {
    const css = read('src/index.css');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('animation-duration: 0.01ms');
    expect(css).toContain('transition-duration: 0.01ms');
  });

  it('supports high-contrast mode', () => {
    const css = read('src/index.css');
    expect(css).toContain('prefers-contrast: more');
  });

  it('defines shimmer animation for optimistic updates', () => {
    const css = read('src/index.css');
    expect(css).toContain('@keyframes shimmer');
    expect(css).toContain('.shimmer');
  });

  it('provides dark mode shimmer variant', () => {
    const css = read('src/index.css');
    expect(css).toContain('.dark .shimmer');
  });
});

describe('tailwind.config.js token coverage', () => {
  it('defines all elevation shadow levels', () => {
    const config = read('tailwind.config.js');
    for (const level of ['sm:', 'md:', 'lg:', 'xl:']) {
      expect(config).toContain(level);
    }
  });

  it('defines named transition durations', () => {
    const config = read('tailwind.config.js');
    for (const name of ['instant:', 'fast:', 'base:', 'slow:', 'slower:']) {
      expect(config).toContain(name);
    }
  });

  it('defines named transition timing functions', () => {
    const config = read('tailwind.config.js');
    expect(config).toContain("'out-quint':");
    expect(config).toContain("spring:");
  });

  it('defines z-index stacking order', () => {
    const config = read('tailwind.config.js');
    for (const level of ['base:', 'sticky:', 'dropdown:', 'panel:', 'bulkbar:', 'modal:', 'palette:', 'toast:']) {
      expect(config).toContain(level);
    }
  });

  it('defines border-radius token scale', () => {
    const config = read('tailwind.config.js');
    expect(config).toContain("sm: '4px'");
    expect(config).toContain("lg: '12px'");
    expect(config).toContain("xl: '22px'");
  });
});

describe('motion.js token coverage', () => {
  it('defines enter/exit/expand/collapse motion roles', () => {
    const motion = read('src/lib/motion.js');
    expect(motion).toContain('enter:');
    expect(motion).toContain('exit:');
    expect(motion).toContain('expand:');
    expect(motion).toContain('collapse:');
  });
});

describe('EmptyState variants', () => {
  it('defines all six state variants', () => {
    const component = read('src/components/works/atoms/empty-state.jsx');
    for (const variant of ['empty', 'onboarding', 'error', 'success', 'warning', 'unauthorized']) {
      expect(component).toContain(`${variant}:`);
    }
  });
});

describe('Skeleton variants', () => {
  it('exports card, table-row, chart, and avatar skeleton variants', () => {
    const skeleton = read('src/components/works/atoms/skeleton.jsx');
    expect(skeleton).toContain('CardSkeleton');
    expect(skeleton).toContain('TableRowSkeleton');
    expect(skeleton).toContain('ChartSkeleton');
    expect(skeleton).toContain('AvatarSkeleton');
  });
});
