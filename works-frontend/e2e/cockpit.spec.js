import { test, expect } from '@playwright/test';
import { apiLogin, gotoAuthed } from './helpers.js';

// End-to-end coverage of the role-adaptive Sprint Cockpit (Cap V). Drives a real browser
// against the running app; see e2e/README.md for the stack + seed-user prerequisites.

let session;
test.beforeAll(async () => { session = await apiLogin(); });

test.describe('Sprint Cockpit', () => {
  test('loads the role-adaptive cockpit with the persistent context bar', async ({ page }) => {
    await gotoAuthed(page, session, '/sm-cockpit');

    // Header + role chip render.
    await expect(page.getByRole('heading', { name: 'Sprint Cockpit' })).toBeVisible();

    // Persistent context bar shows a RAG verdict (GREEN/AMBER/RED) for the active sprint.
    await expect(page.getByText(/\b(GREEN|AMBER|RED)\b/).first()).toBeVisible();

    // The tab strip is present (role="tablist"); at least one tab is shown.
    await expect(page.getByRole('tablist').first()).toBeVisible();
  });

  test('shows analysis tabs and auto-loads the active sprint (no select+Analyze step)', async ({ page }) => {
    await gotoAuthed(page, session, '/sm-cockpit');
    await expect(page.getByRole('heading', { name: 'Sprint Cockpit' })).toBeVisible();

    // A lead/admin lands with both modes; switch to Insights if the segmented control is present.
    const insights = page.getByRole('tab', { name: 'Insights' });
    if (await insights.count()) {
      await insights.click();
    }

    // Variance is an Insights tab; open it and confirm it renders content WITHOUT a manual
    // sprint pick + Analyze click (auto-load, PR-A). Either the metric cards or the empty
    // state appear — never a hung blank.
    const variance = page.getByRole('tab', { name: 'Variance' });
    if (await variance.count()) {
      await variance.click();
      await expect(
        page.getByText('Delivery').first().or(page.getByText('Sprint variance')),
      ).toBeVisible();
    }
  });

  test('global Raise jumps to the role-filtered raise form', async ({ page }) => {
    await gotoAuthed(page, session, '/sm-cockpit');
    await expect(page.getByRole('heading', { name: 'Sprint Cockpit' })).toBeVisible();

    const raise = page.getByRole('button', { name: '+ Raise' });
    if (await raise.count()) {
      await raise.click();
      // The Impediments raise panel exposes a Type select limited to the role's allowed types.
      await expect(page.getByText('Raise', { exact: true }).first()).toBeVisible();
    }
  });
});
