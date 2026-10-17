import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet, apiPost } from './api';
import type { Person } from './types';

interface AuthValue { loading: boolean; authenticated: boolean; authEnabled: boolean; login(password: string): Promise<void>; logout(): Promise<void> }
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ loading: true, authenticated: false, authEnabled: true });
  const refresh = useCallback(() => apiGet<{ authenticated: boolean; authEnabled: boolean }>('/api/auth/session').then(value => setState({ loading: false, ...value })).catch(() => setState(previous => ({ ...previous, loading: false }))), []);
  useEffect(() => { void refresh(); const unauthorized = () => setState(previous => ({ ...previous, authenticated: false })); window.addEventListener('our-wines:unauthorized', unauthorized); return () => window.removeEventListener('our-wines:unauthorized', unauthorized); }, [refresh]);
  const login = async (password: string) => { await apiPost('/api/auth/login', { password }); await refresh(); };
  const logout = async () => { await apiPost('/api/auth/logout'); setState(previous => ({ ...previous, authenticated: false })); };
  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider missing'); return value; }

interface PeopleValue { people: Person[]; selectedPerson: Person | null; loading: boolean; selectPerson(id: string): void; createPerson(displayName: string): Promise<Person>; refresh(): Promise<void> }
const PeopleContext = createContext<PeopleValue | null>(null);

export function PeopleProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('our-wines-person'));
  const refresh = useCallback(async () => {
    if (!authenticated) { setPeople([]); return; }
    setLoading(true);
    try { setPeople(await apiGet<Person[]>('/api/people')); } finally { setLoading(false); }
  }, [authenticated]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (selectedId && people.length && !people.some(person => person.id === selectedId)) { setSelectedId(null); localStorage.removeItem('our-wines-person'); } }, [people, selectedId]);
  const selectPerson = (id: string) => { setSelectedId(id || null); if (id) localStorage.setItem('our-wines-person', id); else localStorage.removeItem('our-wines-person'); };
  const createPerson = async (displayName: string) => { const person = await apiPost<Person>('/api/people', { displayName }); await refresh(); selectPerson(person.id); return person; };
  const selectedPerson = people.find(person => person.id === selectedId) ?? null;
  const value = useMemo(() => ({ people, selectedPerson, loading, selectPerson, createPerson, refresh }), [people, selectedPerson, loading, refresh]);
  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople() { const value = useContext(PeopleContext); if (!value) throw new Error('PeopleProvider missing'); return value; }
