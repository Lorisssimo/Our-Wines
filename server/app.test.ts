import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from './app.js';
import type { AppConfig } from './config.js';
import { createDatabase } from './database.js';

const apps: FastifyInstance[] = [];
const testDirectories: string[] = [];
const baseConfig: AppConfig = {
  nodeEnv: 'test', port: 3000, publicUrl: 'http://localhost:3000', publicOrigin: 'http://localhost:3000', dataDir: '.',
  authEnabled: false, authPassword: 'test-password!', sessionDays: 30,
  scoreWeights: { overall: 8, taste: 6, aftertaste: 3, sweetnessLiking: 3 }, maxUploadBytes: 1024 * 1024
};
const mutationHeaders = { 'x-requested-with': 'OurWines' };

async function app(config: Partial<AppConfig> = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'our-wines-test-'));
  testDirectories.push(dataDir);
  const instance = await buildApp({ config: { ...baseConfig, dataDir, ...config }, database: createDatabase(dataDir, true), serveFrontend: false });
  apps.push(instance);
  return instance;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(instance => instance.close()));
  for (const directory of testDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Our Wines API', () => {
  it('keeps HTTP LAN assets on HTTP while retaining the content security policy', async () => {
    const instance = await app();
    const response = await instance.inject({ method: 'GET', url: '/api/health' });
    const policy = response.headers['content-security-policy'];
    expect(policy).toContain("default-src 'self'");
    expect(policy).not.toContain('upgrade-insecure-requests');
  });

  it('protects private endpoints and supports shared-password login/logout', async () => {
    const instance = await app({ authEnabled: true });
    expect((await instance.inject({ method: 'GET', url: '/api/people' })).statusCode).toBe(401);
    expect((await instance.inject({ method: 'POST', url: '/api/auth/login', headers: mutationHeaders, payload: { password: 'wrong' } })).statusCode).toBe(401);
    const login = await instance.inject({ method: 'POST', url: '/api/auth/login', headers: mutationHeaders, payload: { password: 'test-password!' } });
    expect(login.statusCode).toBe(200);
    const cookie = login.headers['set-cookie'];
    expect((await instance.inject({ method: 'GET', url: '/api/people', headers: { cookie } })).statusCode).toBe(200);
    expect((await instance.inject({ method: 'POST', url: '/api/auth/logout', headers: { ...mutationHeaders, cookie } })).statusCode).toBe(200);
  });

  it('rejects mutation requests without the CSRF marker', async () => {
    const instance = await app();
    const response = await instance.inject({ method: 'POST', url: '/api/people', payload: { displayName: 'Anna' } });
    expect(response.statusCode).toBe(403);
  });

  it('creates people and wines, upserts ratings, and calculates group and personal rankings', async () => {
    const instance = await app();
    const anna = (await instance.inject({ method: 'POST', url: '/api/people', headers: mutationHeaders, payload: { displayName: 'Anna' } })).json();
    const ben = (await instance.inject({ method: 'POST', url: '/api/people', headers: mutationHeaders, payload: { displayName: 'Ben' } })).json();
    expect((await instance.inject({ method: 'POST', url: '/api/people', headers: mutationHeaders, payload: { displayName: ' anna ' } })).statusCode).toBe(409);
    const wine = (await instance.inject({ method: 'POST', url: '/api/wines', headers: mutationHeaders, payload: { name: 'Grauburgunder', wineType: 'white', winery: 'Aufricht', grapeVariety: null, priceMinorUnits: 1290, vintage: null, country: null, region: null, alcoholAbv: null, producerSweetness: 'dry', notes: null } })).json();
    const ratingA = { overall: 5, taste: 4, aftertaste: 3, sweetnessLiking: 2, alcoholFeel: 5, comment: 'Frisch' };
    const ratingB = { overall: 3, taste: 3, aftertaste: 3, sweetnessLiking: 3, alcoholFeel: 1, comment: null };
    expect((await instance.inject({ method: 'PUT', url: `/api/wines/${wine.id}/ratings/${anna.id}`, headers: mutationHeaders, payload: ratingA })).statusCode).toBe(201);
    expect((await instance.inject({ method: 'PUT', url: `/api/wines/${wine.id}/ratings/${ben.id}`, headers: mutationHeaders, payload: ratingB })).statusCode).toBe(201);
    const updated = await instance.inject({ method: 'PUT', url: `/api/wines/${wine.id}/ratings/${anna.id}`, headers: mutationHeaders, payload: { ...ratingA, comment: 'Updated' } });
    expect(updated.statusCode).toBe(200);
    const detail = (await instance.inject({ method: 'GET', url: `/api/wines/${wine.id}` })).json();
    expect(detail.ratings).toHaveLength(2);
    expect(detail.groupScore).toBe(3.48);
    expect(detail.groupOverall).toBe(4);
    expect(detail.detailUrl).toBe(`http://localhost:3000/wines/${wine.id}`);
    const personal = (await instance.inject({ method: 'GET', url: `/api/wines?scope=${anna.id}&rated=rated&sort=score` })).json();
    expect(personal).toHaveLength(1);
    expect(personal[0].scopeScore).toBe(3.95);
    expect((await instance.inject({ method: 'GET', url: '/api/wines?scope=group&wineType=red' })).json()).toHaveLength(0);
    expect((await instance.inject({ method: 'GET', url: '/api/export' })).body).toContain('sweetness_liking');
  });

  it('accepts valid images, normalizes them to WebP, and rejects invalid files', async () => {
    const instance = await app();
    const wine = (await instance.inject({ method: 'POST', url: '/api/wines', headers: mutationHeaders, payload: { name: 'Rosé', wineType: 'rose', winery: null, grapeVariety: null, priceMinorUnits: null, vintage: null, country: null, region: null, alcoholAbv: null, producerSweetness: null, notes: null } })).json();
    const boundary = '----ourwines';
    const invalidBody = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="bad.jpg"\r\nContent-Type: image/jpeg\r\n\r\nnot-an-image\r\n--${boundary}--\r\n`);
    const invalid = await instance.inject({ method: 'POST', url: `/api/wines/${wine.id}/photo`, headers: { ...mutationHeaders, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: invalidBody });
    expect(invalid.statusCode).toBe(415);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    const validBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="bottle.png"\r\nContent-Type: image/png\r\n\r\n`),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    const upload = await instance.inject({ method: 'POST', url: `/api/wines/${wine.id}/photo`, headers: { ...mutationHeaders, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: validBody });
    expect(upload.statusCode).toBe(200);
    expect(upload.json().photoUrl).toMatch(/^\/api\/photos\/[0-9a-f-]+\.webp$/);
    const photo = await instance.inject({ method: 'GET', url: upload.json().photoUrl });
    expect(photo.statusCode).toBe(200);
    expect(photo.headers['content-type']).toBe('image/webp');
  });
});
