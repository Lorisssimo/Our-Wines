import { useState } from 'react';
import { GlassWater, LockKeyhole } from 'lucide-react';
import { useAuth } from '../contexts';

export function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await login(password); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Anmeldung fehlgeschlagen.'); setBusy(false); } };
  return <main className="login-page"><div className="login-card"><div className="login-mark"><GlassWater /></div><p className="eyebrow">Private Weinsammlung</p><h1>Willkommen bei<br />Our Wines</h1><p className="login-intro">Entdeckt eure Favoriten – gemeinsam und ganz persönlich.</p><form onSubmit={submit}><label>Gemeinsames Passwort<div className="input-with-icon"><LockKeyhole size={18} /><input autoFocus type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></div></label>{error && <p className="form-error">{error}</p>}<button className="primary-button wide" disabled={busy}>{busy ? 'Wird geprüft …' : 'Einloggen'}</button></form></div></main>;
}
