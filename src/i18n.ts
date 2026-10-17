export const wineTypeLabels = { white: 'Weiß', red: 'Rot', rose: 'Rosé' } as const;
export const sweetnessLabels = { dry: 'Trocken', semi_dry: 'Halbtrocken', feinherb: 'Feinherb', medium_sweet: 'Lieblich', sweet: 'Süß' } as const;
export const alcoholLabels = ['Sehr mild', 'Mild', 'Ausgewogen', 'Kräftig', 'Sehr kräftig'];

export function compositeTitle(name: string, winery: string | null) {
  if (!winery || name.toLocaleLowerCase('de-DE').includes(winery.toLocaleLowerCase('de-DE'))) return name;
  return `${name} ${winery}`;
}

export function formatPrice(minorUnits: number | null) {
  return minorUnits == null ? null : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minorUnits / 100);
}
