import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPatch, uploadPhoto } from '../api';
import { PageHeader, Status } from '../components/UI';
import { WineForm } from '../components/WineForm';
import type { WineDetail, WineInput } from '../types';

export function EditWinePage() {
  const { id = '' } = useParams(); const navigate = useNavigate();
  const [wine, setWine] = useState<WineDetail | null>(null); const [error, setError] = useState(false);
  useEffect(() => { apiGet<WineDetail>(`/api/wines/${id}`).then(setWine).catch(() => setError(true)); }, [id]);
  const submit = async (input: WineInput, photo: File | null) => { await apiPatch(`/api/wines/${id}`, input); if (photo) await uploadPhoto(id, photo); navigate(`/wines/${id}`); };
  const remove = async () => { if (!window.confirm('Diesen Wein mit allen Bewertungen wirklich löschen?')) return; await apiDelete(`/api/wines/${id}`); navigate('/'); };
  if (error) return <div className="page"><Status kind="error">Wein nicht gefunden.</Status></div>;
  if (!wine) return <div className="page"><Status>Wein wird geladen …</Status></div>;
  const initial: WineInput = { name: wine.name, wineType: wine.wineType, winery: wine.winery, grapeVariety: wine.grapeVariety, priceMinorUnits: wine.priceMinorUnits, vintage: wine.vintage, country: wine.country, region: wine.region, alcoholAbv: wine.alcoholAbv, producerSweetness: wine.producerSweetness, notes: wine.notes };
  return <div className="page"><PageHeader title="Wein bearbeiten" back={`/wines/${id}`} action={<button className="text-danger" onClick={() => void remove()}>Löschen</button>} /><WineForm initial={initial} submitLabel="Änderungen speichern" onSubmit={submit} /></div>;
}
