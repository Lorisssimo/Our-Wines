import { useState } from 'react';
import { apiGet } from '../api';
import { sweetnessLabels } from '../i18n';
import type { ProducerSweetness, Wine, WineInput, WineType } from '../types';

const emptyWine: WineInput = { name: '', wineType: 'white', winery: null, grapeVariety: null, priceMinorUnits: null, vintage: null, country: null, region: null, alcoholAbv: null, producerSweetness: null, notes: null };

export function WineForm({ initial, submitLabel, onSubmit }: { initial?: WineInput; submitLabel: string; onSubmit(value: WineInput, photo: File | null): Promise<void> }) {
  const [value, setValue] = useState(initial ?? emptyWine);
  const [price, setPrice] = useState(value.priceMinorUnits == null ? '' : (value.priceMinorUnits / 100).toFixed(2));
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<Wine[]>([]);
  const text = (field: keyof WineInput, next: string) => setValue(previous => ({ ...previous, [field]: next.trimStart() || null }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSubmit({ ...value, name: value.name.trim(), priceMinorUnits: price ? Math.round(Number(price.replace(',', '.')) * 100) : null }, photo); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Der Wein konnte nicht gespeichert werden.'); setSaving(false); }
  };
  return <form className="wine-form" onSubmit={submit}>
    <section className="form-section"><h2>Weinart</h2><div className="wine-type-choice">{([['white','Weißwein'],['red','Rotwein'],['rose','Rosé']] as Array<[WineType,string]>).map(([key,label]) => <button type="button" key={key} className={`${key} ${value.wineType === key ? 'selected' : ''}`} onClick={() => setValue(previous => ({ ...previous, wineType: key }))}>{label}</button>)}</div></section>
    <section className="form-section"><h2>Grundangaben</h2><label>Weinbezeichnung <em>Pflichtfeld</em><input required maxLength={160} value={value.name} onChange={event => setValue(previous => ({ ...previous, name: event.target.value }))} onBlur={() => { if (value.name.trim().length >= 2) void apiGet<Wine[]>(`/api/wines/duplicates?name=${encodeURIComponent(value.name.trim())}`).then(setDuplicates); }} placeholder="z. B. Grauburgunder" /></label>{duplicates.length > 0 && <p className="duplicate-warning"><strong>Möglicher Doppelgänger:</strong> {duplicates.map(item => [item.name,item.winery].filter(Boolean).join(' · ')).join(', ')}. Du kannst den Wein trotzdem speichern.</p>}<div className="form-grid"><label>Weingut / Hersteller<input maxLength={160} value={value.winery ?? ''} onChange={event => text('winery', event.target.value)} placeholder="z. B. Aufricht" /></label><label>Rebsorte<input maxLength={160} value={value.grapeVariety ?? ''} onChange={event => text('grapeVariety', event.target.value)} /></label></div><label>Flaschenfoto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setPhoto(event.target.files?.[0] ?? null)} /><small>JPEG, PNG oder WebP, maximal 8 MB</small></label></section>
    <section className="form-section"><h2>Weitere Informationen</h2><div className="form-grid"><label>Jahrgang<input type="number" min="1800" max={new Date().getFullYear() + 1} value={value.vintage ?? ''} onChange={event => setValue(previous => ({ ...previous, vintage: event.target.value ? Number(event.target.value) : null }))} /></label><label>Preis in Euro<input inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} placeholder="12,90" /></label><label>Land<input maxLength={100} value={value.country ?? ''} onChange={event => text('country', event.target.value)} /></label><label>Region<input maxLength={160} value={value.region ?? ''} onChange={event => text('region', event.target.value)} /></label><label>Alkohol in % vol.<input type="number" min="0" max="100" step="0.1" value={value.alcoholAbv ?? ''} onChange={event => setValue(previous => ({ ...previous, alcoholAbv: event.target.value ? Number(event.target.value) : null }))} /></label><label>Herstellerangabe zur Süße<select value={value.producerSweetness ?? ''} onChange={event => setValue(previous => ({ ...previous, producerSweetness: (event.target.value || null) as ProducerSweetness | null }))}><option value="">Nicht angegeben</option>{Object.entries(sweetnessLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><label>Notizen<textarea rows={4} maxLength={4000} value={value.notes ?? ''} onChange={event => text('notes', event.target.value)} /></label></section>
    {error && <p className="form-error">{error}</p>}<button className="primary-button wide" disabled={saving}>{saving ? 'Wird gespeichert …' : submitLabel}</button>
  </form>;
}
