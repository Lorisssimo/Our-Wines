import { useNavigate } from 'react-router-dom';
import { apiPost, uploadPhoto } from '../api';
import { PageHeader } from '../components/UI';
import { WineForm } from '../components/WineForm';
import type { Wine, WineInput } from '../types';

export function AddWinePage() {
  const navigate = useNavigate();
  const submit = async (input: WineInput, photo: File | null) => { const wine = await apiPost<Wine>('/api/wines', input); if (photo) await uploadPhoto(wine.id, photo); navigate(`/wines/${wine.id}`); };
  return <div className="page"><PageHeader title="Wein hinzufügen" subtitle="Was möchtet ihr festhalten?" /><WineForm submitLabel="Wein speichern" onSubmit={submit} /></div>;
}
