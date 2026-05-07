import { useCallback, useEffect, useState } from 'react';
import { getLanguage, subscribe, t as translate, tRaw as translateRaw } from './index';

export function useTranslation() {
  const [lang, setLang] = useState(getLanguage());
  useEffect(() => subscribe(setLang), []);
  // `lang` is used to bust the callback identity when the active locale
  // changes — `translate`/`translateRaw` read the live language internally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useCallback((key: string) => translate(key), [lang]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tRaw = useCallback((key: string) => translateRaw(key), [lang]);
  return { t, tRaw, language: lang };
}
