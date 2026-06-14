import { request as pwRequest } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://localhost:8080/api/v1';
const EMAIL = process.env.E2E_EMAIL || 'deepak@bcits.com';
const PASSWORD = process.env.E2E_PASSWORD || 'E2ePass123!';

/** Log in via the API and return { token, user }. Faster and less brittle than driving the
 *  login form, and it keeps cockpit specs focused on the cockpit (the login form has its own
 *  unit/RTL coverage). */
export async function apiLogin(email = EMAIL, password = PASSWORD) {
  const ctx = await pwRequest.newContext();
  const res = await ctx.post(`${API}/auth/login`, { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`E2E login failed (${res.status()}) for ${email} — provision a loginable `
      + `workspace member and set E2E_EMAIL/E2E_PASSWORD (see e2e/README.md). Body: ${await res.text()}`);
  }
  const body = await res.json();
  await ctx.dispose();
  return { token: body.token, user: body.user };
}

/** Seed the persisted session the app reads on boot (localStorage['bSmartSession']), so the
 *  page loads already authenticated. Mirrors App.jsx's own persistence shape. */
export async function authenticate(page, session) {
  await page.addInitScript((s) => {
    window.localStorage.setItem('bSmartSession', JSON.stringify({ user: s.user, token: s.token }));
  }, session);
}

/** Convenience: a fresh authenticated page at the given path. */
export async function gotoAuthed(page, session, path = '/sm-cockpit') {
  await authenticate(page, session);
  await page.goto(path);
}
