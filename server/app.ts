import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import sharp, { type Metadata } from 'sharp';
import { and, eq, like } from 'drizzle-orm';
import { ZodError, z } from 'zod';
import type { AppConfig } from './config.js';
import { createDatabase, type AppDatabase } from './database.js';
import { people, ratings, wines } from './schema.js';
import { average, calculatePersonalScore, roundScore } from './scoring.js';
import { normalizeName, personSchema, ratingSchema, wineSchema } from './validation.js';

const SESSION_COOKIE = 'our_wines_session';
const sessionSchema = z.object({ password: z.string().max(500) });
const idParams = z.object({ id: z.string().uuid() });
const ratingParams = z.object({ id: z.string().uuid(), personId: z.string().uuid() });

interface Session { expiresAt: number }

export interface BuildAppOptions {
  config: AppConfig;
  database?: AppDatabase;
  serveFrontend?: boolean;
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = crypto.createHash('sha256').update(left).digest();
  const rightHash = crypto.createHash('sha256').update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function buildApp({ config, database = createDatabase(config.dataDir), serveFrontend = true }: BuildAppOptions) {
  const app = Fastify({ logger: config.nodeEnv !== 'test', trustProxy: true, bodyLimit: config.maxUploadBytes + 1024 * 1024 });
  const sessions = new Map<string, Session>();
  const uploadsDir = path.join(config.dataDir, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  await app.register(cookie, { secret: crypto.randomBytes(32).toString('hex'), hook: 'onRequest' });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"]
      }
    },
    crossOriginResourcePolicy: { policy: 'same-origin' }
  });
  await app.register(rateLimit, { global: false, max: 100, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: config.maxUploadBytes, files: 1, fields: 0 } });

  function isAuthenticated(request: FastifyRequest): boolean {
    if (!config.authEnabled) return true;
    const raw = request.cookies[SESSION_COOKIE];
    if (!raw) return false;
    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid) return false;
    const session = sessions.get(unsigned.value);
    if (!session || session.expiresAt <= Date.now()) {
      sessions.delete(unsigned.value);
      return false;
    }
    return true;
  }

  app.addHook('onRequest', async (request, reply) => {
    const route = request.url.split('?')[0];
    const publicRoute = route === '/api/health' || route === '/api/auth/login' || route === '/api/auth/session' || route === '/api/config/public';
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (route.startsWith('/api/') && mutation) {
      const marker = request.headers['x-requested-with'];
      const origin = request.headers.origin;
      if (marker !== 'OurWines' || (origin && origin !== config.publicOrigin && !/^http:\/\/localhost:\d+$/.test(origin))) {
        return reply.code(403).send({ error: 'Ungültige Anfrage. Bitte lade die Seite neu.' });
      }
    }
    if ((route.startsWith('/api/') || route.startsWith('/uploads/')) && !publicRoute && !isAuthenticated(request)) {
      return reply.code(401).send({ error: 'Anmeldung erforderlich.' });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: error.issues[0]?.message ?? 'Ungültige Eingabe.', issues: error.issues });
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return reply.code(409).send({ error: 'Dieser Eintrag ist bereits vorhanden.' });
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.code(413).send({ error: `Das Bild darf höchstens ${Math.floor(config.maxUploadBytes / 1024 / 1024)} MB groß sein.` });
    }
    app.log.error(error);
    return reply.code(500).send({ error: 'Ein unerwarteter Fehler ist aufgetreten.' });
  });

  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/config/public', async () => ({ scoreWeights: config.scoreWeights, publicUrl: config.publicUrl, authEnabled: config.authEnabled }));
  app.get('/api/auth/session', async request => ({ authenticated: isAuthenticated(request), authEnabled: config.authEnabled }));
  app.post('/api/auth/login', { config: { rateLimit: { max: 8, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const { password } = sessionSchema.parse(request.body);
    if (!config.authEnabled || safeEqual(password, config.authPassword)) {
      const token = crypto.randomUUID();
      const maxAge = config.sessionDays * 24 * 60 * 60;
      sessions.set(token, { expiresAt: Date.now() + maxAge * 1000 });
      reply.setCookie(SESSION_COOKIE, token, {
        path: '/', httpOnly: true, sameSite: 'strict', secure: new URL(config.publicUrl).protocol === 'https:', signed: true, maxAge
      });
      return { authenticated: true };
    }
    return reply.code(401).send({ error: 'Das Passwort ist nicht korrekt.' });
  });
  app.post('/api/auth/logout', async (request, reply) => {
    const raw = request.cookies[SESSION_COOKIE];
    if (raw) {
      const unsigned = request.unsignCookie(raw);
      if (unsigned.valid) sessions.delete(unsigned.value);
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { authenticated: false };
  });

  app.get('/api/people', async () => database.db.select().from(people).orderBy(people.displayName));
  app.post('/api/people', async (request, reply) => {
    const input = personSchema.parse(request.body);
    const now = new Date().toISOString();
    const person = { id: crypto.randomUUID(), displayName: input.displayName, normalizedName: normalizeName(input.displayName), createdAt: now, updatedAt: now };
    await database.db.insert(people).values(person);
    return reply.code(201).send(person);
  });
  app.patch('/api/people/:id', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const input = personSchema.parse(request.body);
    const result = await database.db.update(people).set({ displayName: input.displayName, normalizedName: normalizeName(input.displayName), updatedAt: new Date().toISOString() }).where(eq(people.id, id)).returning();
    return result[0] ?? reply.code(404).send({ error: 'Person nicht gefunden.' });
  });

  const allRatings = async () => {
    const rows = await database.db.select({
      id: ratings.id, wineId: ratings.wineId, personId: ratings.personId, personName: people.displayName,
      overall: ratings.overall, taste: ratings.taste, aftertaste: ratings.aftertaste,
      sweetnessLiking: ratings.sweetnessLiking, alcoholFeel: ratings.alcoholFeel,
      comment: ratings.comment, createdAt: ratings.createdAt, updatedAt: ratings.updatedAt
    }).from(ratings).innerJoin(people, eq(ratings.personId, people.id));
    return rows.map(row => ({ ...row, personalScore: roundScore(calculatePersonalScore(row, config.scoreWeights)) }));
  };

  const decorateWine = (wine: typeof wines.$inferSelect, wineRatings: Awaited<ReturnType<typeof allRatings>>, scope: string | undefined) => {
    const scoped = scope && scope !== 'group' ? wineRatings.filter(rating => rating.personId === scope) : wineRatings;
    const groupScore = roundScore(average(wineRatings.map(rating => calculatePersonalScore(rating, config.scoreWeights))));
    const groupOverall = roundScore(average(wineRatings.map(rating => rating.overall)));
    const scopeScore = roundScore(average(scoped.map(rating => calculatePersonalScore(rating, config.scoreWeights))));
    const scopeOverall = roundScore(average(scoped.map(rating => rating.overall)));
    return {
      ...wine,
      photoUrl: wine.photoPath ? `/api/photos/${wine.photoPath}` : null,
      groupScore,
      groupOverall,
      ratingCount: wineRatings.length,
      scopeScore,
      scopeOverall,
      scopeRatingCount: scoped.length
    };
  };

  app.get('/api/wines/duplicates', async request => {
    const query = z.object({ name: z.string().trim().min(2).max(160) }).parse(request.query);
    return database.db.select().from(wines).where(like(wines.name, query.name)).limit(5);
  });

  app.get('/api/wines', async request => {
    const query = z.object({
      search: z.string().trim().max(160).optional(), wineType: z.enum(['white', 'red', 'rose']).optional(),
      sweetness: z.enum(['dry', 'semi_dry', 'feinherb', 'medium_sweet', 'sweet']).optional(),
      rated: z.enum(['all', 'rated', 'unrated']).default('all'), scope: z.string().uuid().or(z.literal('group')).default('group'),
      sort: z.enum(['created', 'name', 'price', 'score', 'overall']).default('created'), direction: z.enum(['asc', 'desc']).default('desc'),
      minScore: z.coerce.number().min(1).max(5).optional(), maxPrice: z.coerce.number().int().min(0).optional()
    }).parse(request.query);
    const [wineRows, ratingRows] = await Promise.all([database.db.select().from(wines), allRatings()]);
    const search = query.search?.toLocaleLowerCase('de-DE');
    let result = wineRows.map(wine => decorateWine(wine, ratingRows.filter(rating => rating.wineId === wine.id), query.scope));
    result = result.filter(wine => {
      if (query.wineType && wine.wineType !== query.wineType) return false;
      if (query.sweetness && wine.producerSweetness !== query.sweetness) return false;
      if (search && ![wine.name, wine.winery, wine.grapeVariety].some(value => value?.toLocaleLowerCase('de-DE').includes(search))) return false;
      if (query.rated === 'rated' && wine.scopeRatingCount === 0) return false;
      if (query.rated === 'unrated' && wine.scopeRatingCount > 0) return false;
      if (query.minScore !== undefined && (wine.scopeScore === null || wine.scopeScore < query.minScore)) return false;
      if (query.maxPrice !== undefined && (wine.priceMinorUnits === null || wine.priceMinorUnits > query.maxPrice)) return false;
      return true;
    });
    const factor = query.direction === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      let comparison = 0;
      if (query.sort === 'name') comparison = a.name.localeCompare(b.name, 'de');
      if (query.sort === 'created') comparison = a.createdAt.localeCompare(b.createdAt);
      if (query.sort === 'price') comparison = (a.priceMinorUnits ?? Number.POSITIVE_INFINITY) - (b.priceMinorUnits ?? Number.POSITIVE_INFINITY);
      if (query.sort === 'score') comparison = (a.scopeScore ?? -1) - (b.scopeScore ?? -1);
      if (query.sort === 'overall') comparison = (a.scopeOverall ?? -1) - (b.scopeOverall ?? -1);
      return comparison * factor || a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id);
    });
    return result;
  });

  app.post('/api/wines', async (request, reply) => {
    const input = wineSchema.parse(request.body);
    const now = new Date().toISOString();
    const wine = { id: crypto.randomUUID(), ...input, winery: nullable(input.winery), grapeVariety: nullable(input.grapeVariety), priceMinorUnits: nullable(input.priceMinorUnits), vintage: nullable(input.vintage), country: nullable(input.country), region: nullable(input.region), alcoholAbv: nullable(input.alcoholAbv), producerSweetness: nullable(input.producerSweetness), notes: nullable(input.notes), photoPath: null, createdAt: now, updatedAt: now };
    await database.db.insert(wines).values(wine);
    return reply.code(201).send(wine);
  });

  app.get('/api/wines/:id', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const [wine] = await database.db.select().from(wines).where(eq(wines.id, id));
    if (!wine) return reply.code(404).send({ error: 'Wein nicht gefunden.' });
    const ratingRows = (await allRatings()).filter(rating => rating.wineId === id);
    return { ...decorateWine(wine, ratingRows, 'group'), ratings: ratingRows, detailUrl: `${config.publicUrl}/wines/${id}` };
  });

  app.patch('/api/wines/:id', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const input = wineSchema.parse(request.body);
    const [wine] = await database.db.update(wines).set({ ...input, updatedAt: new Date().toISOString() }).where(eq(wines.id, id)).returning();
    return wine ?? reply.code(404).send({ error: 'Wein nicht gefunden.' });
  });

  app.delete('/api/wines/:id', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const [wine] = await database.db.select().from(wines).where(eq(wines.id, id));
    if (!wine) return reply.code(404).send({ error: 'Wein nicht gefunden.' });
    await database.db.delete(wines).where(eq(wines.id, id));
    if (wine.photoPath) fs.rm(path.join(uploadsDir, wine.photoPath), { force: true }, () => undefined);
    return reply.code(204).send();
  });

  app.post('/api/wines/:id/photo', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const [wine] = await database.db.select().from(wines).where(eq(wines.id, id));
    if (!wine) return reply.code(404).send({ error: 'Wein nicht gefunden.' });
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Bitte wähle ein Bild aus.' });
    const buffer = await file.toBuffer();
    let metadata: Metadata;
    try { metadata = await sharp(buffer).metadata(); } catch { return reply.code(415).send({ error: 'Die Bilddatei ist ungültig.' }); }
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) return reply.code(415).send({ error: 'Erlaubt sind JPEG, PNG und WebP.' });
    const filename = `${crypto.randomUUID()}.webp`;
    await sharp(buffer).rotate().resize({ width: 1600, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(path.join(uploadsDir, filename));
    await database.db.update(wines).set({ photoPath: filename, updatedAt: new Date().toISOString() }).where(eq(wines.id, id));
    if (wine.photoPath) fs.rm(path.join(uploadsDir, wine.photoPath), { force: true }, () => undefined);
    return { photoUrl: `/api/photos/${filename}` };
  });

  app.get('/api/photos/:filename', async (request, reply) => {
    const { filename } = z.object({ filename: z.string().regex(/^[0-9a-f-]{36}\.webp$/) }).parse(request.params);
    const target = path.join(uploadsDir, filename);
    if (!fs.existsSync(target)) return reply.code(404).send({ error: 'Bild nicht gefunden.' });
    reply.header('Content-Type', 'image/webp').header('Cache-Control', 'private, max-age=86400');
    return reply.send(fs.createReadStream(target));
  });

  app.get('/api/wines/:id/ratings', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const [wine] = await database.db.select({ id: wines.id }).from(wines).where(eq(wines.id, id));
    if (!wine) return reply.code(404).send({ error: 'Wein nicht gefunden.' });
    return (await allRatings()).filter(rating => rating.wineId === id);
  });

  app.put('/api/wines/:id/ratings/:personId', async (request, reply) => {
    const { id, personId } = ratingParams.parse(request.params);
    const input = ratingSchema.parse(request.body);
    const [[wine], [person]] = await Promise.all([
      database.db.select({ id: wines.id }).from(wines).where(eq(wines.id, id)),
      database.db.select({ id: people.id }).from(people).where(eq(people.id, personId))
    ]);
    if (!wine || !person) return reply.code(404).send({ error: 'Wein oder Person nicht gefunden.' });
    const now = new Date().toISOString();
    const [existing] = await database.db.select().from(ratings).where(and(eq(ratings.wineId, id), eq(ratings.personId, personId)));
    if (existing) {
      const [updated] = await database.db.update(ratings).set({ ...input, updatedAt: now }).where(eq(ratings.id, existing.id)).returning();
      return { ...updated, personalScore: roundScore(calculatePersonalScore(updated, config.scoreWeights)) };
    }
    const rating = { id: crypto.randomUUID(), wineId: id, personId, ...input, createdAt: now, updatedAt: now };
    await database.db.insert(ratings).values(rating);
    return reply.code(201).send({ ...rating, personalScore: roundScore(calculatePersonalScore(rating, config.scoreWeights)) });
  });

  app.delete('/api/wines/:id/ratings/:personId', async (request, reply) => {
    const { id, personId } = ratingParams.parse(request.params);
    await database.db.delete(ratings).where(and(eq(ratings.wineId, id), eq(ratings.personId, personId)));
    return reply.code(204).send();
  });

  app.get('/api/export', async (_request, reply) => {
    const wineRows = await database.db.select().from(wines);
    const ratingRows = await allRatings();
    const header = ['wine_id','name','wine_type','winery','grape_variety','vintage','price_eur','person','overall','taste','aftertaste','sweetness_liking','alcohol_feel','personal_score','comment'];
    const rows = wineRows.flatMap(wine => {
      const matches = ratingRows.filter(rating => rating.wineId === wine.id);
      const entries = matches.length ? matches : [null];
      return entries.map(rating => [wine.id,wine.name,wine.wineType,wine.winery,wine.grapeVariety,wine.vintage,wine.priceMinorUnits == null ? null : (wine.priceMinorUnits / 100).toFixed(2),rating?.personName,rating?.overall,rating?.taste,rating?.aftertaste,rating?.sweetnessLiking,rating?.alcoholFeel,rating?.personalScore,rating?.comment].map(csvCell).join(','));
    });
    reply.header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="our-wines-export.csv"');
    return `\uFEFF${header.join(',')}\n${rows.join('\n')}\n`;
  });

  if (serveFrontend) {
    const frontendRoot = path.resolve('dist');
    if (fs.existsSync(frontendRoot)) {
      await app.register(fastifyStatic, { root: frontendRoot, wildcard: false });
      app.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/')) return reply.code(404).send({ error: 'Nicht gefunden.' });
        return reply.sendFile('index.html');
      });
    }
  }

  app.addHook('onClose', async () => database.sqlite.close());
  return app;
}
