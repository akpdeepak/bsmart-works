import { describe, it, expect } from 'vitest';
import { slaTone, formatMinutes, slaLabel } from './serviceSla';

describe('slaTone', () => {
  it('maps states to semantic tones', () => {
    expect(slaTone('BREACHED')).toBe('danger');
    expect(slaTone('AT_RISK')).toBe('warning');
    expect(slaTone('ON_TRACK')).toBe('success');
    expect(slaTone('MET')).toBe('success');
    expect(slaTone('NONE')).toBe('neutral');
  });
});

describe('formatMinutes', () => {
  it('formats hours and minutes from a signed count', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(-10)).toBe('10m');
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(null)).toBe('0m');
  });
});

describe('slaLabel', () => {
  it('handles the no-SLA case', () => {
    expect(slaLabel(null)).toBe('No SLA');
    expect(slaLabel({ state: 'NONE' })).toBe('No SLA');
  });

  it('labels each live state', () => {
    expect(slaLabel({ state: 'ON_TRACK', minutesRemaining: 90 })).toBe('1h 30m left');
    expect(slaLabel({ state: 'AT_RISK', minutesRemaining: 20 })).toBe('At risk · 20m left');
    expect(slaLabel({ state: 'BREACHED', minutesRemaining: -15, breached: true })).toBe('Breached · 15m over');
    expect(slaLabel({ state: 'MET', minutesRemaining: 30 })).toBe('Met');
  });
});
