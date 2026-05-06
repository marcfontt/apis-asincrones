import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { translateRenderedText, type Locale } from './index';
import { useTranslation } from './useTranslation';

const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt'];
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'SVG']);

const shouldSkipElement = (element: Element | null) => {
  if (!element) return true;
  if (SKIPPED_TAGS.has(element.tagName)) return true;
  return Boolean(element.closest('[data-i18n-skip="true"]'));
};

const translateTextNode = (node: Text, language: Locale) => {
  if (shouldSkipElement(node.parentElement)) return;
  const translated = translateRenderedText(node.nodeValue ?? '', language);
  if (translated !== node.nodeValue) {
    node.nodeValue = translated;
  }
};

const translateAttributes = (element: Element, language: Locale) => {
  if (shouldSkipElement(element)) return;

  TRANSLATABLE_ATTRIBUTES.forEach(attribute => {
    const value = element.getAttribute(attribute);
    if (!value) return;
    const translated = translateRenderedText(value, language);
    if (translated !== value) {
      element.setAttribute(attribute, translated);
    }
  });
};

const translateTree = (root: ParentNode, language: Locale) => {
  if (root instanceof Element) {
    translateAttributes(root, language);
  }

  const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let element = elementWalker.nextNode();
  while (element) {
    translateAttributes(element as Element, language);
    element = elementWalker.nextNode();
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let text = textWalker.nextNode();
  while (text) {
    translateTextNode(text as Text, language);
    text = textWalker.nextNode();
  }
};

/**
 * Temporary bridge for legacy React surfaces that still contain visible
 * hardcoded literals. New UI should keep using useTranslation directly.
 */
export const LanguageDomBridge = () => {
  const { language } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    let frame: number | null = null;
    let followUpTimer: number | null = null;

    const applyTranslations = () => {
      frame = null;
      if (document.title) {
        document.title = translateRenderedText(document.title, language);
      }
      if (document.body) {
        translateTree(document.body, language);
      }
    };

    const scheduleTranslations = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(applyTranslations);
    };

    scheduleTranslations();
    followUpTimer = window.setTimeout(scheduleTranslations, 80);

    const observer = new MutationObserver(scheduleTranslations);
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRIBUTES,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      if (followUpTimer !== null) {
        window.clearTimeout(followUpTimer);
      }
    };
  }, [language, location.pathname, location.search]);

  return null;
};
