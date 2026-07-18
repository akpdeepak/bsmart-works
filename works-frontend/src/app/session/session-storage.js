export function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('bSmartSession') || 'null');
  } catch {
    return null;
  }
}
