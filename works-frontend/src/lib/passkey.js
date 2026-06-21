// bSmart Works — passkey (WebAuthn / FIDO2) browser helper (iteration 19 Cap T, RB-40 §4).
//
// Real FIDO2 via the WebAuthn API: the platform authenticator (Touch ID, Windows Hello, a roaming
// security key…) holds the private key, which never leaves the device. `navigator.credentials.create`
// returns an attestation and `.get` returns an assertion; the backend (WebAuthnFido2Verifier) verifies
// origin + rpId + signature + counter. base64url is the wire format for every binary field — the
// server issues challenges/ids as base64url and expects attestationObject/clientDataJSON/signature
// back the same way.

function bytesToB64url(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// A passkey needs a WebAuthn-capable browser (PublicKeyCredential) in a secure context.
export function passkeysSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

// Register a new passkey. `begin()` returns the server's PublicKeyCredentialCreationOptions shape
// (challenge / rp / user / pubKeyCredParams / … with binary fields base64url-encoded); `finish(body)`
// persists the verified credential.
export async function registerPasskey({ begin, finish, label, workspaceId }) {
  const opts = await begin();
  const publicKey = {
    challenge: b64urlToBytes(opts.challenge),
    rp: opts.rp,
    user: {
      id: b64urlToBytes(opts.user.id),
      name: opts.user.name,
      displayName: opts.user.displayName,
    },
    pubKeyCredParams: opts.pubKeyCredParams,
    timeout: opts.timeout,
    attestation: opts.attestation || 'none',
    authenticatorSelection: opts.authenticatorSelection,
    excludeCredentials: (opts.excludeCredentials || []).map((c) => ({
      type: c.type,
      id: b64urlToBytes(c.id),
    })),
  };
  const credential = await navigator.credentials.create({ publicKey });
  if (!credential) throw new Error('Passkey creation was cancelled.');
  const response = credential.response;
  return finish({
    attestationObject: bytesToB64url(response.attestationObject),
    clientDataJSON: bytesToB64url(response.clientDataJSON),
    label,
    transports: typeof response.getTransports === 'function'
      ? response.getTransports().join(',')
      : 'internal',
    workspaceId,
  });
}

// Passwordless sign-in. `begin(email)` returns the server's PublicKeyCredentialRequestOptions shape
// (challenge / rpId / allowCredentials / userVerification / userId); `finish(body)` verifies the
// assertion and returns { token, user }.
export async function authenticatePasskey({ email, begin, finish }) {
  const opts = await begin(email);
  const publicKey = {
    challenge: b64urlToBytes(opts.challenge),
    rpId: opts.rpId,
    allowCredentials: (opts.allowCredentials || []).map((c) => ({
      type: c.type,
      id: b64urlToBytes(c.id),
    })),
    userVerification: opts.userVerification || 'preferred',
    timeout: opts.timeout,
  };
  const assertion = await navigator.credentials.get({ publicKey });
  if (!assertion) throw new Error('Passkey sign-in was cancelled.');
  const response = assertion.response;
  return finish({
    userId: opts.userId,
    credentialId: bytesToB64url(assertion.rawId),
    authenticatorData: bytesToB64url(response.authenticatorData),
    clientDataJSON: bytesToB64url(response.clientDataJSON),
    signature: bytesToB64url(response.signature),
    userHandle: response.userHandle ? bytesToB64url(response.userHandle) : null,
  });
}
