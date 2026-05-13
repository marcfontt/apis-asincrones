import ca from './locales/ca.json';
import es from './locales/es.json';
import en from './locales/en.json';
import { RUNTIME_TEXT_TRANSLATIONS } from './runtimeText';

export type Locale = 'ca' | 'es' | 'en';
export type DictValue = string | string[] | Dictionary | DictValue[];
export type Dictionary = { [key: string]: DictValue };

const STORAGE_KEY = 'apis-asincrones.language';
const DICTIONARIES: Record<Locale, Dictionary> = {
  ca: ca as unknown as Dictionary,
  es: es as unknown as Dictionary,
  en: en as unknown as Dictionary,
};
const listeners = new Set<(lang: Locale) => void>();

const isLocale = (value: string | null): value is Locale =>
  value === 'ca' || value === 'es' || value === 'en';

const readStoredLanguage = (): Locale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : 'ca';
  } catch {
    return 'ca';
  }
};

const notifyLanguageChange = (lang: Locale) => {
  listeners.forEach(fn => fn(lang));
};

let currentLanguage: Locale = readStoredLanguage();

const normalizeRenderedText = (value: string) => value.replace(/\s+/g, ' ').trim();

const flattenStrings = (
  node: DictValue | undefined,
  prefix: string,
  output: Record<string, string>,
) => {
  if (typeof node === 'string') {
    output[prefix] = node;
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, index) => flattenStrings(item, `${prefix}.${index}`, output));
    return;
  }
  if (node && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => {
      flattenStrings(value, prefix ? `${prefix}.${key}` : key, output);
    });
  }
};

const buildRenderedTextMaps = () => {
  const flattened: Record<Locale, Record<string, string>> = {
    ca: {},
    es: {},
    en: {},
  };
  (Object.keys(DICTIONARIES) as Locale[]).forEach(lang => {
    flattenStrings(DICTIONARIES[lang], '', flattened[lang]);
  });

  const maps: Record<Locale, Map<string, string>> = {
    ca: new Map(),
    es: new Map(),
    en: new Map(),
  };

  const addEntry = (entry: Record<Locale, string>) => {
    const sources = [entry.ca, entry.es, entry.en].map(normalizeRenderedText).filter(Boolean);
    (Object.keys(maps) as Locale[]).forEach(targetLanguage => {
      const targetText = entry[targetLanguage];
      sources.forEach(source => maps[targetLanguage].set(source, targetText));
    });
  };

  Object.keys(flattened.ca).forEach(key => {
    const entry = {
      ca: flattened.ca[key],
      es: flattened.es[key],
      en: flattened.en[key],
    };
    if (entry.ca && entry.es && entry.en) {
      addEntry(entry);
    }
  });

  RUNTIME_TEXT_TRANSLATIONS.forEach(addEntry);
  return maps;
};

const RENDERED_TEXT_MAPS = buildRenderedTextMaps();
const RENDERED_TEXT_REPLACEMENTS: Record<Locale, Array<[string, string]>> = {
  ca: Array.from(RENDERED_TEXT_MAPS.ca.entries()).sort((a, b) => b[0].length - a[0].length),
  es: Array.from(RENDERED_TEXT_MAPS.es.entries()).sort((a, b) => b[0].length - a[0].length),
  en: Array.from(RENDERED_TEXT_MAPS.en.entries()).sort((a, b) => b[0].length - a[0].length),
};

export function getLanguage(): Locale {
  return currentLanguage;
}

export function changeLanguage(lang: Locale): void {
  currentLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  notifyLanguageChange(lang);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY || !isLocale(event.newValue)) return;
    if (event.newValue === currentLanguage) return;
    currentLanguage = event.newValue;
    notifyLanguageChange(event.newValue);
  });
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

export function translateRenderedText(value: string, lang: Locale = currentLanguage): string {
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return value;
  const [, leading, core, trailing] = match;
  const normalized = normalizeRenderedText(core);
  if (!normalized) return value;
  const translated = RENDERED_TEXT_MAPS[lang].get(normalized);
  if (translated) return `${leading}${translated}${trailing}`;

  let translatedCore = normalized;
  for (const [source, target] of RENDERED_TEXT_REPLACEMENTS[lang]) {
    if (source.length < 8 || !translatedCore.includes(source)) continue;
    // Avoid replacement loops when the translated word contains the original word.
    if (target !== source && target.includes(source)) continue;
    translatedCore = translatedCore.split(source).join(target);
  }

  return translatedCore !== normalized ? `${leading}${translatedCore}${trailing}` : value;
}

export function subscribe(fn: (lang: Locale) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
