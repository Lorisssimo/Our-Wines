import type { RatingValues, ScoreWeights } from '../shared/types.js';

export function calculatePersonalScore(rating: RatingValues, weights: ScoreWeights): number {
  const total = weights.overall + weights.taste + weights.aftertaste + weights.sweetnessLiking;
  if (!Number.isFinite(total) || total <= 0) throw new Error('Score weight total must be positive.');
  return (
    rating.overall * weights.overall +
    rating.taste * weights.taste +
    rating.aftertaste * weights.aftertaste +
    rating.sweetnessLiking * weights.sweetnessLiking
  ) / total;
}

export function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function roundScore(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100) / 100;
}
