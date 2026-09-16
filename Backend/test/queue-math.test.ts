import { describe, expect, it } from 'vitest';

import { littleLawWaitMinutes, triangularSummary } from '../src/services/queue-math.js';

describe('littleLawWaitMinutes', () => {
  it('converts hours to minutes', () => {
    expect(littleLawWaitMinutes(10, 5)).toBe(120);
  });

  it('rejects zero arrivals and invalid load', () => {
    expect(littleLawWaitMinutes(10, 0)).toBeNull();
    expect(littleLawWaitMinutes(-1, 2)).toBeNull();
  });
});

describe('triangularSummary', () => {
  it('derives min, max, mode, and expected duration', () => {
    expect(triangularSummary([10, 20, 20, 40])).toEqual({
      minimumMinutes: 10,
      maximumMinutes: 40,
      mostLikelyMinutes: 20,
      expectedMinutes: 70 / 3,
    });
  });

  it('requires sufficient history', () => {
    expect(triangularSummary([10, 20])).toBeNull();
  });
});
