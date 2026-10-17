import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const people = sqliteTable('people', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, table => [uniqueIndex('people_normalized_name_unique').on(table.normalizedName)]);

export const wines = sqliteTable('wines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  wineType: text('wine_type', { enum: ['white', 'red', 'rose'] }).notNull(),
  winery: text('winery'),
  grapeVariety: text('grape_variety'),
  photoPath: text('photo_path'),
  priceMinorUnits: integer('price_minor_units'),
  vintage: integer('vintage'),
  country: text('country'),
  region: text('region'),
  alcoholAbv: real('alcohol_abv'),
  producerSweetness: text('producer_sweetness', { enum: ['dry', 'semi_dry', 'feinherb', 'medium_sweet', 'sweet'] }),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const ratings = sqliteTable('ratings', {
  id: text('id').primaryKey(),
  wineId: text('wine_id').notNull().references(() => wines.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  overall: integer('overall').notNull(),
  taste: integer('taste').notNull(),
  aftertaste: integer('aftertaste').notNull(),
  sweetnessLiking: integer('sweetness_liking').notNull(),
  alcoholFeel: integer('alcohol_feel').notNull(),
  comment: text('comment'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, table => [uniqueIndex('ratings_wine_person_unique').on(table.wineId, table.personId)]);
