import { describe, expect, it } from 'vitest';
import { average, calculatePersonalScore, roundScore } from './scoring.js';

const rating = { overall: 5, taste: 4, aftertaste: 3, sweetnessLiking: 2, alcoholFeel: 5 };

describe('score calculations', () => {
  it('uses the configured default 8:6:3:3 weights and excludes alcohol feeling', () => {
    expect(calculatePersonalScore(rating, { overall: 8, taste: 6, aftertaste: 3, sweetnessLiking: 3 })).toBe(3.95);
    expect(calculatePersonalScore({ ...rating, alcoholFeel: 1 }, { overall: 8, taste: 6, aftertaste: 3, sweetnessLiking: 3 })).toBe(3.95);
  });

  it('recalculates using changed weights', () => {
    expect(calculatePersonalScore(rating, { overall: 1, taste: 0, aftertaste: 0, sweetnessLiking: 0 })).toBe(5);
    expect(calculatePersonalScore(rating, { overall: 0, taste: 0, aftertaste: 0, sweetnessLiking: 1 })).toBe(2);
  });

  it('returns null for missing group ratings and averages 1–4 ratings', () => {
    expect(average([])).toBeNull();
    expect(average([5])).toBe(5);
    expect(average([5, 3])).toBe(4);
    expect(average([5, 3, 4])).toBe(4);
    expect(average([5, 3, 4, 2])).toBe(3.5);
    expect(roundScore(4.126)).toBe(4.13);
  });
});
