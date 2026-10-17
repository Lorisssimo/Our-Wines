import { useEffect, useState } from 'react';
import { Check, Copy, Edit3, QrCode, Share2, Star } from 'lucide-react';
import QRCode from 'qrcode';
import { Link, useParams } from 'react-router-dom';
import { apiGet } from '../api';
import { PageHeader, ScoreBadge, Status, WineImage } from '../components/UI';
import { usePeople } from '../contexts';
import { alcoholLabels, compositeTitle, formatPrice, sweetnessLabels, wineTypeLabels } from '../i18n';
import type { Rating, WineDetail } from '../types';

export function WineDetailPage() {
  const { id = '' } = useParams(); const { selectedPerson } = usePeople();
  const [wine, setWine] = useState<WineDetail | null>(null); const [error, setError] = useState(false); const [qr, setQr] = useState(''); const [copied, setCopied] = useState(false);
  useEffect(() => { setError(false); apiGet<WineDetail>(`/api/wines/${id}`).then(value => { setWine(value); void QRCode.toDataURL(value.detailUrl, { width: 480, margin: 1, color: { dark: '#282526', light: '#F8F5F0' } }).then(setQr); }).catch(() => setError(true)); }, [id]);
  if (error) return <div className="page"><PageHeader title="Nicht gefunden" back="/" /><Status kind="error">Dieser Wein ist nicht vorhanden oder wurde gelöscht.</Status></div>;
  if (!wine) return <div className="page"><Status>Wein wird geladen …</Status></div>;
  const selectedRating = wine.ratings.find(rating => rating.personId === selectedPerson?.id);
  const copy = async () => { await navigator.clipboard.writeText(wine.detailUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const share = async () => { if (navigator.share) await navigator.share({ title: compositeTitle(wine.name, wine.winery), url: wine.detailUrl }); else await copy(); };
  const metadata = [
    ['Weinart', `${wineTypeLabels[wine.wineType]}wein`], ['Rebsorte', wine.grapeVariety], ['Jahrgang', wine.vintage], ['Preis', formatPrice(wine.priceMinorUnits)],
    ['Herkunft', [wine.region, wine.country].filter(Boolean).join(', ') || null], ['Alkohol', wine.alcoholAbv == null ? null : `${wine.alcoholAbv.toLocaleString('de-DE')} % vol.`],
    ['Herstellerangabe', wine.producerSweetness ? sweetnessLabels[wine.producerSweetness] : null]
  ].filter(([,value]) => value != null);
  return <div className="page detail-page"><PageHeader title="Weindetails" back="/" action={<Link className="icon-button" to={`/wines/${id}/edit`} aria-label="Wein bearbeiten"><Edit3 size={18} /></Link>} />
    <section className="detail-hero"><WineImage large src={wine.photoUrl} alt={compositeTitle(wine.name, wine.winery)} /><div className="detail-title"><span className={`wine-kind ${wine.wineType}`}>{wineTypeLabels[wine.wineType]}</span><h1>{compositeTitle(wine.name, wine.winery)}</h1>{wine.winery && !wine.name.toLocaleLowerCase('de-DE').includes(wine.winery.toLocaleLowerCase('de-DE')) && <p>{wine.winery}</p>}</div></section>
    {metadata.length > 0 && <section className="detail-section"><h2>Über den Wein</h2><dl className="metadata-grid">{metadata.map(([label,value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{wine.notes && <p className="notes">{wine.notes}</p>}</section>}
    <section className="score-panel"><div><p className="eyebrow">Gemeinsame Bewertung</p><div className="scores"><ScoreBadge score={wine.groupScore} /><div><strong>{wine.groupOverall?.toFixed(2) ?? '–'}</strong><span>Gesamtnote</span></div></div><p className="muted small">{wine.ratingCount} {wine.ratingCount === 1 ? 'Bewertung' : 'Bewertungen'}</p></div>
      {!selectedPerson ? <div className="rate-prompt"><p>Wähle oben eine Person, um diesen Wein zu bewerten.</p></div> : <Link className={selectedRating ? 'secondary-button' : 'primary-button'} to={`/wines/${id}/rate`}>{selectedRating ? 'Bewertung anpassen' : 'Wein bewerten'}</Link>}
    </section>
    <section className="detail-section"><h2>Einzelbewertungen</h2>{!wine.ratings.length ? <div className="empty-inline"><Star /><p><strong>Noch keine Bewertung</strong><br />Wie schmeckt euch dieser Wein?</p></div> : <div className="rating-list">{wine.ratings.map(rating => <RatingCard key={rating.id} rating={rating} selected={rating.personId === selectedPerson?.id} />)}</div>}</section>
    <section className="detail-section share-section"><div><p className="eyebrow">Am Tisch teilen</p><h2>Direkt zu diesem Wein</h2><p className="muted">Der QR-Code öffnet genau diese Detailseite. Gegebenenfalls ist zuerst das gemeinsame Passwort nötig.</p><div className="share-actions"><button className="secondary-button" onClick={() => void share()}><Share2 size={18} /> Teilen</button><button className="text-button" onClick={() => void copy()}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'Kopiert' : 'Link kopieren'}</button></div></div>{qr ? <img className="qr-code" src={qr} alt="QR-Code zur Weinseite" /> : <QrCode className="qr-placeholder" />}</section>
  </div>;
}

function RatingCard({ rating, selected }: { rating: Rating; selected: boolean }) {
  return <article className={selected ? 'rating-card selected' : 'rating-card'}><header><div><h3>{rating.personName}</h3>{selected && <span>Du</span>}</div><strong>{rating.personalScore.toFixed(2)}</strong></header><div className="rating-criteria"><span>Gesamtnote <b>{rating.overall}/5</b></span><span>Geschmack <b>{rating.taste}/5</b></span><span>Nachgeschmack <b>{rating.aftertaste}/5</b></span><span>Süße / Herbheit <b>{rating.sweetnessLiking}/5</b></span><span>Alkoholgefühl <b>{alcoholLabels[rating.alcoholFeel - 1]}</b></span></div>{rating.comment && <p>„{rating.comment}“</p>}</article>;
}
