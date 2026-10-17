import { useState, type ReactNode } from 'react';
import { GlassWater, Heart, LogOut, Plus, UserRound, Wine } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth, usePeople } from '../contexts';

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const mainRoute = ['/', '/add', '/favorites'].includes(location.pathname);
  return <div className={mainRoute ? 'app-shell with-nav' : 'app-shell'}>
    <header className="topbar">
      <NavLink to="/" className="brand"><span className="brand-mark"><GlassWater size={20} /></span><span>Our Wines</span></NavLink>
      <PersonMenu />
    </header>
    <main>{children}</main>
    {mainRoute && <nav className="bottom-nav" aria-label="Hauptnavigation">
      <NavLink to="/" end><Wine /><span>Sammlung</span></NavLink>
      <NavLink to="/add"><span className="add-orb"><Plus /></span><span>Hinzufügen</span></NavLink>
      <NavLink to="/favorites"><Heart /><span>Favoriten</span></NavLink>
    </nav>}
  </div>;
}

function PersonMenu() {
  const { people, selectedPerson, selectPerson, createPerson } = usePeople();
  const { logout, authEnabled } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try { await createPerson(name); setName(''); setOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Person konnte nicht erstellt werden.'); }
  };
  return <div className="person-menu">
    <button className="person-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open}><UserRound size={18} /><span>{selectedPerson?.displayName ?? 'Person wählen'}</span></button>
    {open && <div className="menu-card">
      <p className="eyebrow">Wer bewertet?</p>
      <div className="person-list">
        {people.map(person => <button key={person.id} className={selectedPerson?.id === person.id ? 'selected' : ''} onClick={() => { selectPerson(person.id); setOpen(false); }}>{person.displayName}</button>)}
        {!people.length && <p className="muted small">Noch keine Person angelegt.</p>}
      </div>
      <form onSubmit={submit} className="inline-form">
        <input aria-label="Neue Person" placeholder="Neuer Name" value={name} onChange={event => setName(event.target.value)} required maxLength={80} />
        <button className="icon-button" aria-label="Person hinzufügen"><Plus size={18} /></button>
      </form>
      {error && <p className="field-error">{error}</p>}
      {authEnabled && <button className="logout-button" onClick={() => void logout()}><LogOut size={16} /> Abmelden</button>}
    </div>}
  </div>;
}
