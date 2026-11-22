import { describe, it, expect } from 'vitest';
import { formatScore, getAnomalySeverity } from '../utils/formatters';

describe('Phase 1 Utility Test Suite', () => {
  it('correctly formats numerical scores', () => {
    expect(formatScore(0.8523)).toBe('0.852');
    expect(formatScore(null)).toBe('N/A');
  });

  it('evaluates anomaly severity correctly', () => {
    expect(getAnomalySeverity(0.85)).toBe('high');
    expect(getAnomalySeverity(0.60)).toBe('medium');
    expect(getAnomalySeverity(0.20)).toBe('low');
  });
});
