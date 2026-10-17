import { useEffect, useState } from 'react';
import { Download, Search, SlidersHorizontal } from 'lucide-react';
import { apiGet } from '../api';
import { PageHeader, Status, WineTypeTabs } from '../components/UI';
import { WineCard } from '../components/WineCard';
import type { ProducerSweetness, Wine, WineType } from '../types';
import { sweetnessLabels } from '../i18n';

export function CollectionPage() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [type, setType] = useState<WineType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sweetness, setSweetness] = useState<ProducerSweetness | ''>('');
  const [rated, setRated] = useState('all');
  const [sort, setSort] = useState('created');
  const [direction, setDirection] = useState('desc');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStatus('loading'); const query = new URLSearchParams({ scope: 'group', sort, direction, rated });
      if (type !== 'all') query.set('wineType', type); if (search) query.set('search', search); if (sweetness) query.set('sweetness', sweetness);
      apiGet<Wine[]>(`/api/wines?${query}`).then(value => { setWines(value); setStatus('ready'); }).catch(() => setStatus('error'));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [type, search, sweetness, rated, sort, direction]);
  return <div className="page"><PageHeader title="Sammlung" subtitle={`${wines.length} ${wines.length === 1 ? 'Wein' : 'Weine'}`} action={<a className="icon-button" href="/api/export" title="CSV exportieren"><Download size={18} /></a>} />
    <WineTypeTabs value={type} onChange={setType} />
    <div className="search-box"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Wein, Weingut oder Rebsorte" aria-label="Sammlung durchsuchen" /></div>
    <div className="control-panels"><details><summary><SlidersHorizontal size={17} /> Filter</summary><div className="control-content"><label>Herstellerangabe<select value={sweetness} onChange={event => setSweetness(event.target.value as ProducerSweetness | '')}><option value="">Alle</option>{Object.entries(sweetnessLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Bewertungsstatus<select value={rated} onChange={event => setRated(event.target.value)}><option value="all">Alle</option><option value="rated">Bewertet</option><option value="unrated">Nicht bewertet</option></select></label></div></details><details><summary>Sortierung</summary><div className="control-content"><label>Sortieren nach<select value={sort} onChange={event => setSort(event.target.value)}><option value="created">Hinzugefügt</option><option value="name">Name</option><option value="score">Gemeinsamer Score</option><option value="overall">Gesamtnote</option><option value="price">Preis</option></select></label><label>Richtung<select value={direction} onChange={event => setDirection(event.target.value)}><option value="desc">Absteigend</option><option value="asc">Aufsteigend</option></select></label></div></details></div>
    {status === 'loading' && <Status>Weine werden geladen …</Status>}{status === 'error' && <Status kind="error">Die Sammlung konnte nicht geladen werden.</Status>}{status === 'ready' && wines.length === 0 && <Status kind="empty"><strong>Noch nichts im Glas.</strong><span>Füge deinen ersten Wein hinzu oder passe die Filter an.</span></Status>}{status === 'ready' && <div className="wine-list">{wines.map(wine => <WineCard key={wine.id} wine={wine} />)}</div>}
  </div>;
}
