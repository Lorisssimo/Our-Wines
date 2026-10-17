import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable().transform(value => value || null);

export const personSchema = z.object({ displayName: z.string().trim().min(1, 'Name ist erforderlich.').max(80) });

export const wineSchema = z.object({
  name: z.string().trim().min(1, 'Weinbezeichnung ist erforderlich.').max(160),
  wineType: z.enum(['white', 'red', 'rose']),
  winery: optionalText(160),
  grapeVariety: optionalText(160),
  priceMinorUnits: z.number().int().min(0).max(100_000_000).optional().nullable(),
  vintage: z.number().int().min(1800).max(new Date().getFullYear() + 1).optional().nullable(),
  country: optionalText(100),
  region: optionalText(160),
  alcoholAbv: z.number().min(0).max(100).optional().nullable(),
  producerSweetness: z.enum(['dry', 'semi_dry', 'feinherb', 'medium_sweet', 'sweet']).optional().nullable(),
  notes: optionalText(4000)
});

export const ratingSchema = z.object({
  overall: z.number().int().min(1).max(5),
  taste: z.number().int().min(1).max(5),
  aftertaste: z.number().int().min(1).max(5),
  sweetnessLiking: z.number().int().min(1).max(5),
  alcoholFeel: z.number().int().min(1).max(5),
  comment: optionalText(2000)
});

export function normalizeName(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('de-DE').replace(/\s+/g, ' ');
}
