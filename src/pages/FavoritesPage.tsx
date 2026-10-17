import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { apiGet } from '../api';
import { WineCard } from '../components/WineCard';
import { PageHeader, Status, WineTypeTabs } from '../components/UI';
import { usePeople } from '../contexts';
import type { Wine, WineType } from '../types';

export function FavoritesPage() {
  const { people, selectedPerson } = usePeople();
  const [scope, setScope] = useState('group'); const [type, setType] = useState<WineType | 'all'>('all');
  const [sort, setSort] = useState('score'); const [direction, setDirection] = useState('desc'); const [minScore, setMinScore] = useState('');
  const [wines, setWines] = useState<Wine[]>([]); const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading');
  useEffect(() => { const query = new URLSearchParams({ scope, rated: 'rated', sort, direction }); if (type !== 'all') query.set('wineType', type); if (minScore) query.set('minScore', minScore); setStatus('loading'); apiGet<Wine[]>(`/api/wines?${query}`).then(value => { setWines(value); setStatus('ready'); }).catch(() => setStatus('error')); }, [scope,type,sort,direction,minScore]);
  useEffect(() => { if (scope !== 'group' && !people.some(person => person.id === scope)) setScope(selectedPerson?.id ?? 'group'); }, [people, selectedPerson, scope]);
  return <div className="page"><PageHeader title="Favoriten" subtitle="Eure besten Entdeckungen" /><WineTypeTabs value={type} onChange={setType} />
    <div className="scope-switch"><button className={scope === 'group' ? 'active' : ''} onClick={() => setScope('group')}>Gemeinsam</button><select aria-label="Persönliches Ranking" value={scope === 'group' ? '' : scope} onChange={event => setScope(event.target.value || 'group')}><option value="">Persönlich …</option>{people.map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></div>
    <div className="control-panels"><details><summary><SlidersHorizontal size={17} /> Filter</summary><div className="control-content"><label>Mindestscore<select value={minScore} onChange={event => setMinScore(event.target.value)}><option value="">Alle</option><option value="3">ab 3,0</option><option value="3.5">ab 3,5</option><option value="4">ab 4,0</option><option value="4.5">ab 4,5</option></select></label></div></details><details><summary>Sortierung</summary><div className="control-content"><label>Sortieren nach<select value={sort} onChange={event => setSort(event.target.value)}><option value="score">Berechneter Score</option><option value="overall">Gesamtnote</option><option value="name">Name</option><option value="price">Preis</option></select></label><label>Richtung<select value={direction} onChange={event => setDirection(event.target.value)}><option value="desc">Absteigend</option><option value="asc">Aufsteigend</option></select></label></div></details></div>
    {status === 'loading' && <Status>Ranking wird berechnet …</Status>}{status === 'error' && <Status kind="error">Favoriten konnten nicht geladen werden.</Status>}{status === 'ready' && !wines.length && <Status kind="empty"><strong>Noch keine Favoriten.</strong><span>Bewertet Weine, um euer Ranking zu füllen.</span></Status>}{status === 'ready' && <div className="wine-list ranked">{wines.map((wine,index) => <WineCard key={wine.id} wine={wine} rank={index + 1} />)}</div>}
  </div>;
}
