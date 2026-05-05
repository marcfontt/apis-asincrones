import ca from './locales/ca.json';
import es from './locales/es.json';
import en from './locales/en.json';

type Locale = 'ca' | 'es' | 'en';
type Dictionary = { [key: string]: string | Dictionary };

const STORAGE_KEY = 'apis-asincrones.language';
const DICTIONARIES: Record<Locale, Dictionary> = {
  ca: ca as Dictionary,
  es: es as Dictionary,
  en: en as Dictionary,
};
const listeners = new Set<(lang: Locale) => void>();
let currentLanguage: Locale =
  (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? 'ca';

export function getLanguage(): Locale {
  return currentLanguage;
}

export function changeLanguage(lang: Locale): void {
  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach(fn => fn(lang));
}

// Walks dot-separated key path through the dictionary tree.
// Returns the original key if any segment is missing or the final value
// isn't a string.
export function t(key: string): string {
  const segments = key.split('.');
  let node: string | Dictionary | undefined = DICTIONARIES[currentLanguage];
  for (const segment of segments) {
    if (node && typeof node === 'object' && segment in node) {
      node = (node as Dictionary)[segment];
    } else {
      return key;
    }
  }
  return typeof node === 'string' ? node : key;
}

export function subscribe(fn: (lang: Locale) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
