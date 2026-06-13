import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { AiBudgetNotice } from './ai-budget-notice';
import { expectNoA11yViolations } from '@/test/a11y';

const DEGRADED = { period: '2026-06', capCents: 5000000, spentCents: 4250000, percent: 85, degraded: true, disabled: false };
const DISABLED = { period: '2026-06', capCents: 5000000, spentCents: 5000000, percent: 100, degraded: true, disabled: true };

describe('AiBudgetNotice a11y', () => {
  it('degraded banner has no serious/critical violations', async () => {
    const { container } = render(<AiBudgetNotice status={DEGRADED} />);
    await expectNoA11yViolations(container);
  });
  it('disabled banner has no serious/critical violations', async () => {
    const { container } = render(<AiBudgetNotice status={DISABLED} />);
    await expectNoA11yViolations(container);
  });
});
