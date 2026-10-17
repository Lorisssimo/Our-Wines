import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { compositeTitle, formatPrice, wineTypeLabels } from '../i18n';
import type { Wine } from '../types';
import { ScoreBadge, WineImage } from './UI';

export function WineCard({ wine, rank }: { wine: Wine; rank?: number }) {
  const metadata = [wine.grapeVariety, wine.vintage, formatPrice(wine.priceMinorUnits)].filter(Boolean);
  return <Link to={`/wines/${wine.id}`} className="wine-card">
    {rank && <span className="rank">{rank}</span>}
    <WineImage src={wine.photoUrl} alt={compositeTitle(wine.name, wine.winery)} />
    <div className="wine-card-copy"><span className={`wine-kind ${wine.wineType}`}>{wineTypeLabels[wine.wineType]}</span><h2 title={compositeTitle(wine.name, wine.winery)}>{compositeTitle(wine.name, wine.winery)}</h2>{metadata.length > 0 && <p>{metadata.join(' · ')}</p>}</div>
    <ScoreBadge score={wine.scopeScore ?? wine.groupScore} />
    <ChevronRight className="card-chevron" />
  </Link>;
}
