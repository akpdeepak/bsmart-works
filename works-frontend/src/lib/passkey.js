// bSmart Works — passkey (WebAuthn) browser helper (iteration 19 Cap T).
//
// A software authenticator built on WebCrypto: it generates an ECDSA P-256 key pair, keeps the
// private key in the browser (the server only ever sees the public key), and signs the server's
// single-use challenge — the exact challenge–response the backend (WebAuthnCrypto) verifies. This
// demonstrates phishing-resistant, passwordless auth end-to-end. A production hardening pass swaps
// this for the platform authenticator via navigator.credentials (full FIDO2/CBOR) — the server
// contract is unchanged.

const STORE_KEY = 'bSmartPasskeys';

function b64url(bytes) {
  let s = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemFromSpki(spki) {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)));
  const lines = b64.match(/.{1,64}/g)?.join('\n') ?? b64;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

// Convert a WebCrypto P1363 (r||s) ECDSA signature to the ASN.1 DER the JVM's
// SHA256withECDSA verifier expects.
function p1363ToDer(raw) {
  const bytes = new Uint8Array(raw);
  const half = bytes.length / 2;
  const encodeInt = (intBytes) => {
    let i = 0;
    while (i < intBytes.length - 1 && intBytes[i] === 0) i += 1;
    let trimmed = intBytes.slice(i);
    if (trimmed[0] & 0x80) trimmed = Uint8Array.from([0, ...trimmed]); // keep it positive
    return Uint8Array.from([0x02, trimmed.length, ...trimmed]);
  };
  const r = encodeInt(bytes.slice(0, half));
  const s = encodeInt(bytes.slice(half));
  return Uint8Array.from([0x30, r.length + s.length, ...r, ...s]);
}

function loadKeys() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveKey(credentialId, jwk) {
  const keys = loadKeys();
  keys[credentialId] = jwk;
  localStorage.setItem(STORE_KEY, JSON.stringify(keys));
}

export function passkeysSupported() {
  return typeof window !== 'undefined' && !!(window.crypto && window.crypto.subtle);
}

async function signChallenge(jwk, challenge) {
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  );
  const raw = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(challenge),
  );
  return b64url(p1363ToDer(raw));
}

// Generate a key pair, prove possession of it over the begin-ceremony challenge, and register.
// `begin` returns { challenge }, `finish(payload)` persists the credential.
export async function registerPasskey({ begin, finish, label, workspaceId }) {
  const { challenge } = await begin();
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'],
  );
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
  const publicKeyPem = pemFromSpki(spki);
  const credentialId = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);

  const sigKey = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  );
  const raw = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, sigKey, new TextEncoder().encode(challenge),
  );
  const signature = b64url(p1363ToDer(raw));

  const result = await finish({
    credentialId, publicKeyPem, algorithm: 'ES256', label, transports: 'internal',
    signature, workspaceId,
  });
  saveKey(credentialId, jwk); // keep the private key so this device can sign in later
  return result;
}

// Complete a passwordless sign-in: `begin(email)` → { challenge, userId, credentialIds }, sign with
// the matching stored private key, then `finish({ userId, credentialId, signature })`.
export async function authenticatePasskey({ email, begin, finish }) {
  const { challenge, userId, credentialIds } = await begin(email);
  const keys = loadKeys();
  const credentialId = (credentialIds || []).find((id) => keys[id]);
  if (!credentialId) {
    throw new Error('No passkey for this account is registered on this device.');
  }
  const signature = await signChallenge(keys[credentialId], challenge);
  return finish({ userId, credentialId, signature });
}
