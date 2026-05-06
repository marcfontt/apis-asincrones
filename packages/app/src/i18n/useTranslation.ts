import { useCallback, useEffect, useState } from 'react';
import { getLanguage, subscribe, t as translate, tRaw as translateRaw } from './index';

export function useTranslation() {
  const [lang, setLang] = useState(getLanguage());
  useEffect(() => subscribe(setLang), []);
  const t = useCallback((key: string) => translate(key), [lang]);
  const tRaw = useCallback((key: string) => translateRaw(key), [lang]);
  return { t, tRaw, language: lang };
}
