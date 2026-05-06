import ca from './locales/ca.json';
import es from './locales/es.json';
import en from './locales/en.json';

type Locale = 'ca' | 'es' | 'en';
type DictValue = string | string[] | Dictionary | DictValue[];
type Dictionary = { [key: string]: DictValue };

const STORAGE_KEY = 'apis-asincrones.language';
const DICTIONARIES: Record<Locale, Dictionary> = {
  ca: ca as unknown as Dictionary,
  es: es as unknown as Dictionary,
  en: en as unknown as Dictionary,
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
// Walk one path segment. Supports both objects (string keys) and arrays
// (numeric string keys like "0", "1"). Returns undefined when the segment
// is not present.
function walk(node: DictValue | undefined, segment: string): DictValue | undefined {
  if (node === undefined || node === null) return undefined;
  if (Array.isArray(node)) {
    const idx = Number(segment);
    if (!Number.isInteger(idx) || idx < 0 || idx >= node.length) return undefined;
    return node[idx];
  }
  if (typeof node === 'object' && segment in node) {
    return (node as Dictionary)[segment];
  }
  return undefined;
}

export function t(key: string): string {
  const segments = key.split('.');
  let node: DictValue | undefined = DICTIONARIES[currentLanguage];
  for (const segment of segments) {
    node = walk(node, segment);
    if (node === undefined) return key;
  }
  return typeof node === 'string' ? node : key;
}

// Returns raw value (string, array, or object) at the dot path.
// Use when you need arrays or nested objects from the locale tree.
export function tRaw(key: string): DictValue | undefined {
  const segments = key.split('.');
  let node: DictValue | undefined = DICTIONARIES[currentLanguage];
  for (const segment of segments) {
    node = walk(node, segment);
    if (node === undefined) return undefined;
  }
  return node;
}

export function subscribe(fn: (lang: Locale) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
