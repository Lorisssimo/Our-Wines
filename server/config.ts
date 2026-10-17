import path from 'node:path';
import { z } from 'zod';
import type { ScoreWeights } from '../shared/types.js';

const booleanValue = z.string().default('true').transform(value => value.toLowerCase() === 'true');
const finiteWeight = z.coerce.number().finite().nonnegative();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  DATA_DIR: z.string().min(1).default('./data'),
  AUTH_ENABLED: booleanValue,
  AUTH_PASSWORD: z.string().default('123456'),
  AUTH_SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  SCORE_WEIGHT_OVERALL: finiteWeight.default(8),
  SCORE_WEIGHT_TASTE: finiteWeight.default(6),
  SCORE_WEIGHT_AFTERTASTE: finiteWeight.default(3),
  SCORE_WEIGHT_SWEETNESS: finiteWeight.default(3),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(25).default(8)
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  publicUrl: string;
  publicOrigin: string;
  dataDir: string;
  authEnabled: boolean;
  authPassword: string;
  sessionDays: number;
  scoreWeights: ScoreWeights;
  maxUploadBytes: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const weights = {
    overall: parsed.SCORE_WEIGHT_OVERALL,
    taste: parsed.SCORE_WEIGHT_TASTE,
    aftertaste: parsed.SCORE_WEIGHT_AFTERTASTE,
    sweetnessLiking: parsed.SCORE_WEIGHT_SWEETNESS
  };
  if (Object.values(weights).reduce((sum, weight) => sum + weight, 0) <= 0) {
    throw new Error('Score weights must have a total greater than zero.');
  }
  if (parsed.NODE_ENV === 'production' && parsed.AUTH_ENABLED) {
    const password = parsed.AUTH_PASSWORD.trim();
    const weak = password === '123456' || password.length < 12 || !/[A-Za-z]/.test(password) || !/[^A-Za-z0-9]/.test(password);
    if (weak) {
      throw new Error('Refusing to start: AUTH_PASSWORD is empty, the known example, or trivially weak. Set a password of at least 12 characters containing letters and a symbol.');
    }
  }
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    publicUrl: parsed.APP_PUBLIC_URL.replace(/\/$/, ''),
    publicOrigin: new URL(parsed.APP_PUBLIC_URL).origin,
    dataDir: path.resolve(parsed.DATA_DIR),
    authEnabled: parsed.AUTH_ENABLED,
    authPassword: parsed.AUTH_PASSWORD,
    sessionDays: parsed.AUTH_SESSION_DAYS,
    scoreWeights: weights,
    maxUploadBytes: Math.floor(parsed.MAX_UPLOAD_MB * 1024 * 1024)
  };
}
