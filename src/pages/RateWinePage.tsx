import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPut } from '../api';
import { PageHeader, StarInput, Status } from '../components/UI';
import { usePeople } from '../contexts';
import { alcoholLabels, compositeTitle } from '../i18n';
import type { RatingInput, WineDetail } from '../types';

const emptyRating: RatingInput = { overall: 0, taste: 0, aftertaste: 0, sweetnessLiking: 0, alcoholFeel: 0, comment: null };

export function RateWinePage() {
  const { id = '' } = useParams(); const navigate = useNavigate(); const { selectedPerson } = usePeople();
  const [wine, setWine] = useState<WineDetail | null>(null); const [value, setValue] = useState<RatingInput>(emptyRating); const [existing, setExisting] = useState(false); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { apiGet<WineDetail>(`/api/wines/${id}`).then(result => { setWine(result); const rating = result.ratings.find(item => item.personId === selectedPerson?.id); if (rating) { setExisting(true); setValue({ overall: rating.overall, taste: rating.taste, aftertaste: rating.aftertaste, sweetnessLiking: rating.sweetnessLiking, alcoholFeel: rating.alcoholFeel, comment: rating.comment }); } }); }, [id, selectedPerson?.id]);
  if (!selectedPerson) return <div className="page"><PageHeader title="Wein bewerten" back={`/wines/${id}`} /><Status kind="empty">Bitte wähle zuerst oben eine Person aus.</Status></div>;
  if (!wine) return <div className="page"><Status>Bewertung wird vorbereitet …</Status></div>;
  const update = (field: keyof RatingInput, next: number | string | null) => setValue(previous => ({ ...previous, [field]: next }));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if ([value.overall,value.taste,value.aftertaste,value.sweetnessLiking,value.alcoholFeel].some(item => item < 1)) { setError('Bitte fülle alle fünf Bewertungen aus.'); return; } setSaving(true); setError(''); try { await apiPut(`/api/wines/${id}/ratings/${selectedPerson.id}`, value); navigate(`/wines/${id}`); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bewertung konnte nicht gespeichert werden.'); setSaving(false); } };
  const remove = async () => { if (!window.confirm('Deine Bewertung wirklich löschen?')) return; await apiDelete(`/api/wines/${id}/ratings/${selectedPerson.id}`); navigate(`/wines/${id}`); };
  return <div className="page rating-page"><PageHeader title={existing ? 'Bewertung anpassen' : 'Wein bewerten'} subtitle={compositeTitle(wine.name, wine.winery)} back={`/wines/${id}`} />
    <div className="rating-person">Bewertung von <strong>{selectedPerson.displayName}</strong></div>
    <form onSubmit={submit} className="rating-form"><section className="form-section"><p className="eyebrow">Qualität</p><StarInput label="Gesamtnote" hint="Dein Gesamteindruck" value={value.overall} onChange={next => update('overall', next)} /><StarInput label="Geschmack" hint="Wie gut gefällt dir der Geschmack?" value={value.taste} onChange={next => update('taste', next)} /><StarInput label="Nachgeschmack" hint="Wie gut gefällt dir der Abgang?" value={value.aftertaste} onChange={next => update('aftertaste', next)} /><StarInput label="Süße / Herbheit" hint="Wie gut gefällt dir die Balance?" value={value.sweetnessLiking} onChange={next => update('sweetnessLiking', next)} /></section>
      <section className="form-section"><p className="eyebrow">Eindruck – ohne Einfluss auf den Score</p><fieldset className="alcohol-field"><legend>Alkoholgefühl</legend><div>{alcoholLabels.map((label,index) => <button type="button" key={label} className={value.alcoholFeel === index + 1 ? 'selected' : ''} onClick={() => update('alcoholFeel', index + 1)}><b>{index + 1}</b><span>{label}</span></button>)}</div></fieldset><label>Kommentar <span className="optional">optional</span><textarea rows={4} maxLength={2000} value={value.comment ?? ''} onChange={event => update('comment', event.target.value || null)} placeholder="Was ist dir aufgefallen?" /></label></section>
      {error && <p className="form-error">{error}</p>}<button className="primary-button wide" disabled={saving}>{saving ? 'Wird gespeichert …' : 'Bewertung speichern'}</button>{existing && <button type="button" className="text-danger centered" onClick={() => void remove()}>Bewertung löschen</button>}
    </form>
  </div>;
}
