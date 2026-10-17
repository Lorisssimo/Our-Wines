import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const migration = `
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  wine_type TEXT NOT NULL CHECK(wine_type IN ('white','red','rose')),
  winery TEXT,
  grape_variety TEXT,
  photo_path TEXT,
  price_minor_units INTEGER CHECK(price_minor_units IS NULL OR price_minor_units >= 0),
  vintage INTEGER,
  country TEXT,
  region TEXT,
  alcohol_abv REAL,
  producer_sweetness TEXT CHECK(producer_sweetness IS NULL OR producer_sweetness IN ('dry','semi_dry','feinherb','medium_sweet','sweet')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  wine_id TEXT NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  overall INTEGER NOT NULL CHECK(overall BETWEEN 1 AND 5),
  taste INTEGER NOT NULL CHECK(taste BETWEEN 1 AND 5),
  aftertaste INTEGER NOT NULL CHECK(aftertaste BETWEEN 1 AND 5),
  sweetness_liking INTEGER NOT NULL CHECK(sweetness_liking BETWEEN 1 AND 5),
  alcohol_feel INTEGER NOT NULL CHECK(alcohol_feel BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(wine_id, person_id)
);
CREATE INDEX IF NOT EXISTS ratings_wine_idx ON ratings(wine_id);
CREATE INDEX IF NOT EXISTS ratings_person_idx ON ratings(person_id);
CREATE INDEX IF NOT EXISTS wines_type_idx ON wines(wine_type);
`;

export function createDatabase(dataDir: string, memory = false) {
  if (!memory) fs.mkdirSync(dataDir, { recursive: true });
  const sqlite = new Database(memory ? ':memory:' : path.join(dataDir, 'our-wines.sqlite'));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.exec(migration);
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

export type AppDatabase = ReturnType<typeof createDatabase>;
