import { describe, it, expect, beforeEach } from 'vitest';
import {
  isBiometricSupported, isBiometricEnabled, bufferToBase64url, base64urlToBuffer, disableBiometric,
} from './biometric';

beforeEach(() => localStorage.clear());

describe('biometric', () => {
  it('reports unsupported when WebAuthn is absent (jsdom)', () => {
    expect(isBiometricSupported()).toBe(false);
    expect(isBiometricEnabled()).toBe(false);
  });

  it('round-trips base64url encoding', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]).buffer;
    const encoded = bufferToBase64url(bytes);
    expect(encoded).not.toMatch(/[+/=]/); // url-safe, no padding
    const decoded = new Uint8Array(base64urlToBuffer(encoded));
    expect(Array.from(decoded)).toEqual([0, 1, 2, 250, 251, 252, 253, 254, 255]);
  });

  it('disableBiometric clears stored state', () => {
    localStorage.setItem('bSmartBiometricEnabled', 'true');
    localStorage.setItem('bSmartBiometricCredential', 'abc');
    disableBiometric();
    expect(localStorage.getItem('bSmartBiometricEnabled')).toBeNull();
    expect(localStorage.getItem('bSmartBiometricCredential')).toBeNull();
  });
});
