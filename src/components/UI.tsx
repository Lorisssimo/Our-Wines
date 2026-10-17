import { ArrowLeft, Image as ImageIcon, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WineType } from '../types';

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: string; action?: React.ReactNode }) {
  return <div className="page-header">
    <div className="page-heading-row">{back && <Link className="back-button" to={back} aria-label="Zurück"><ArrowLeft /></Link>}<div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="header-action">{action}</div>}</div>
  </div>;
}

export function WineTypeTabs({ value, onChange }: { value: WineType | 'all'; onChange(value: WineType | 'all'): void }) {
  const options: Array<[WineType | 'all', string]> = [['all','Alle'],['white','Weiß'],['red','Rot'],['rose','Rosé']];
  return <div className="type-tabs" role="tablist" aria-label="Weinart">{options.map(([key,label]) => <button key={key} role="tab" aria-selected={value === key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}>{label}</button>)}</div>;
}

export function WineImage({ src, alt, large = false }: { src: string | null; alt: string; large?: boolean }) {
  return <div className={`wine-image ${large ? 'large' : ''}`}>{src ? <img src={src} alt={alt} /> : <div className="image-placeholder"><ImageIcon aria-hidden /><span>Kein Foto</span></div>}</div>;
}

export function ScoreBadge({ score, label = 'Score' }: { score: number | null; label?: string }) {
  return score == null ? <span className="unrated">Nicht bewertet</span> : <span className="score-badge"><strong>{score.toFixed(2)}</strong><small>{label}</small></span>;
}

export function StarInput({ value, onChange, label, hint }: { value: number; onChange(value: number): void; label: string; hint?: string }) {
  return <fieldset className="star-field"><legend>{label}{hint && <span>{hint}</span>}</legend><div className="stars">{[1,2,3,4,5].map(star => <button type="button" key={star} onClick={() => onChange(star)} aria-label={`${star} von 5`} aria-pressed={value === star}><Star className={star <= value ? 'filled' : ''} /></button>)}</div></fieldset>;
}

export function Status({ kind = 'loading', children }: { kind?: 'loading' | 'empty' | 'error'; children: React.ReactNode }) {
  return <div className={`status-card ${kind}`}>{kind === 'loading' && <span className="spinner" />}{children}</div>;
}
