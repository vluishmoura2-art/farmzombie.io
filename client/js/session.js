export const SESSION_KEY = 'farmzombie.session';
const LEGACY_KEY = 'zombs-session';

// Reads the reconnect token, moving a token saved under the old key.
export function readSession() {
  try {
    const legacy = sessionStorage.getItem(LEGACY_KEY);
    if (legacy !== null) { sessionStorage.setItem(SESSION_KEY, legacy); sessionStorage.removeItem(LEGACY_KEY); }
    return sessionStorage.getItem(SESSION_KEY);
  } catch { return null; }
}
export function saveSession(token) { try { sessionStorage.setItem(SESSION_KEY, token); } catch {} }
export function clearSession() { try { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(LEGACY_KEY); } catch {} }
