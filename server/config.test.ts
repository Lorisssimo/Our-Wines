import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

function environment(overrides: Record<string, string> = {}) {
  return { NODE_ENV: 'test', DATA_DIR: './test-data', APP_PUBLIC_URL: 'http://localhost:3000', AUTH_ENABLED: 'false', ...overrides };
}

describe('environment configuration', () => {
  it('loads default score weights', () => {
    expect(loadConfig(environment()).scoreWeights).toEqual({ overall: 8, taste: 6, aftertaste: 3, sweetnessLiking: 3 });
  });

  it('rejects a zero weight total', () => {
    expect(() => loadConfig(environment({ SCORE_WEIGHT_OVERALL: '0', SCORE_WEIGHT_TASTE: '0', SCORE_WEIGHT_AFTERTASTE: '0', SCORE_WEIGHT_SWEETNESS: '0' }))).toThrow(/total/i);
  });

  it.each(['123456', '', 'onlyletterslong'])('rejects weak production passwords: %s', password => {
    expect(() => loadConfig(environment({ NODE_ENV: 'production', AUTH_ENABLED: 'true', AUTH_PASSWORD: password }))).toThrow(/refusing to start/i);
  });

  it('accepts a strong production password and disabled authentication', () => {
    expect(loadConfig(environment({ NODE_ENV: 'production', AUTH_ENABLED: 'true', AUTH_PASSWORD: 'correct-horse!battery' })).authEnabled).toBe(true);
    expect(loadConfig(environment({ NODE_ENV: 'production', AUTH_ENABLED: 'false', AUTH_PASSWORD: '123456' })).authEnabled).toBe(false);
  });
});
