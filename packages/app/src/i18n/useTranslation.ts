import { useEffect, useState } from 'react';
import { getLanguage, subscribe, t as translate } from './index';

export function useTranslation() {
  const [lang, setLang] = useState(getLanguage());
  useEffect(() => subscribe(setLang), []);
  return { t: translate, language: lang };
}
