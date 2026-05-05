import ca from './locales/ca.json';
import es from './locales/es.json';
import en from './locales/en.json';

type Locale = 'ca' | 'es' | 'en';
const STORAGE_KEY = 'apis-asincrones.language';
const DICTIONARIES: Record<Locale, Record<string, string>> = { ca, es, en };
const listeners = new Set<(lang: Locale) => void>();
let currentLanguage: Locale = (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? 'ca';

export function getLanguage(): Locale { return currentLanguage; }

export function changeLanguage(lang: Locale): void {
  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach(fn => fn(lang));
}

export function t(key: string): string {
  return DICTIONARIES[currentLanguage]?.[key] ?? key;
}

export function subscribe(fn: (lang: Locale) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
