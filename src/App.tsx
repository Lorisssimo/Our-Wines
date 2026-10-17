import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Status } from './components/UI';
import { AuthProvider, PeopleProvider, useAuth } from './contexts';
import { AddWinePage } from './pages/AddWinePage';
import { CollectionPage } from './pages/CollectionPage';
import { EditWinePage } from './pages/EditWinePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { LoginPage } from './pages/LoginPage';
import { RateWinePage } from './pages/RateWinePage';
import { WineDetailPage } from './pages/WineDetailPage';

function AuthenticatedApp() {
  const { loading, authenticated } = useAuth();
  if (loading) return <main className="splash"><Status>Our Wines wird geöffnet …</Status></main>;
  if (!authenticated) return <LoginPage />;
  return <PeopleProvider><Shell><Routes><Route path="/" element={<CollectionPage />} /><Route path="/add" element={<AddWinePage />} /><Route path="/favorites" element={<FavoritesPage />} /><Route path="/wines/:id" element={<WineDetailPage />} /><Route path="/wines/:id/edit" element={<EditWinePage />} /><Route path="/wines/:id/rate" element={<RateWinePage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Shell></PeopleProvider>;
}

export default function App() { return <AuthProvider><AuthenticatedApp /></AuthProvider>; }
