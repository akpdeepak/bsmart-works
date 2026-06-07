// Biometric app-unlock (iteration 18, Cap S — "Face ID / Touch ID / Android biometric for app
// unlock."). This is a *local* device unlock gate, not server authentication (passkeys/WebAuthn for
// auth are iteration 19, Cap T). It uses the platform authenticator via WebAuthn purely to confirm
// the device owner is present, then unlocks the already-authenticated session on this device.
//
// Pure encoding helpers are exported for unit testing; the WebAuthn calls are feature-detected so
// the app degrades gracefully where biometrics aren't available.
const CRED_KEY = 'bSmartBiometricCredential';
const ENABLED_KEY = 'bSmartBiometricEnabled';

export function isBiometricSupported() {
  return typeof window !== 'undefined'
    && typeof window.PublicKeyCredential !== 'undefined'
    && !!navigator.credentials;
}

export function isBiometricEnabled() {
  return isBiometricSupported() && localStorage.getItem(ENABLED_KEY) === 'true' && !!localStorage.getItem(CRED_KEY);
}

export function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlToBuffer(value) {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const str = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

function randomChallenge() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr;
}

// Enrol this device: create a platform-authenticator credential and remember its id. Returns true on
// success. Throws nothing — returns false if the user cancels or biometrics are unavailable.
export async function enableBiometric(userId, userName) {
  if (!isBiometricSupported()) return false;
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: { name: 'bSmart Works' },
        user: {
          id: new TextEncoder().encode(userId || 'user'),
          name: userName || 'user',
          displayName: userName || 'user',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
      },
    });
    if (!cred) return false;
    localStorage.setItem(CRED_KEY, bufferToBase64url(cred.rawId));
    localStorage.setItem(ENABLED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

export function disableBiometric() {
  localStorage.removeItem(CRED_KEY);
  localStorage.removeItem(ENABLED_KEY);
}

// Prompt for biometric verification to unlock. Returns true if the platform authenticator confirms
// the user; false on cancel/failure.
export async function unlockWithBiometric() {
  if (!isBiometricEnabled()) return false;
  try {
    const credId = localStorage.getItem(CRED_KEY);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{ type: 'public-key', id: base64urlToBuffer(credId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}
