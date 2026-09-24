import { i18nInstance } from '@/i18n/instance';
import {
  DEFAULT_LANGUAGE,
  isAppLanguage,
  type AppLanguage,
} from '@/i18n/constants';

export type LooseCopy<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends object
    ? { [K in keyof T]: LooseCopy<T[K]> }
    : T extends string
      ? string
      : T;

const englishFallbacks = new Map<string, object>();

export function registerEnglishNamespace<T extends object>(namespace: string, source: T): T {
  englishFallbacks.set(namespace, source);
  return source;
}

function walk(root: object, path: Array<string | symbol>): unknown {
  let current: unknown = root;
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = Reflect.get(current, key);
  }
  return current;
}

export function getNamespaceBundle<T extends object>(
  namespace: string,
  languageHint?: string,
): LooseCopy<T> {
  const language = languageHint
    ?? (i18nInstance.isInitialized
      ? (i18nInstance.resolvedLanguage ?? i18nInstance.language)
      : DEFAULT_LANGUAGE);
  const bundle =
    (i18nInstance.isInitialized ? i18nInstance.getResourceBundle(language, namespace) : undefined) ??
    englishFallbacks.get(namespace);
  if (!bundle) {
    throw new Error(`Missing i18n namespace: ${namespace}`);
  }
  return bundle as LooseCopy<T>;
}

export function createLiveCopy<T extends object>(namespace: string): T {
  const live = (path: Array<string | symbol> = []): object =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === '__namespace') {
            return namespace;
          }
          const parent = getNamespaceBundle<T>(namespace);
          const current = walk(parent, path);
          if (current === null || current === undefined || typeof current !== 'object') {
            return undefined;
          }
          const value = Reflect.get(current, prop);
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return live([...path, prop]);
          }
          return value;
        },
        ownKeys() {
          const current = walk(getNamespaceBundle<T>(namespace), path);
          return current && typeof current === 'object' ? Reflect.ownKeys(current) : [];
        },
        getOwnPropertyDescriptor(_target, prop) {
          const current = walk(getNamespaceBundle<T>(namespace), path);
          if (!current || typeof current !== 'object' || !(prop in current)) {
            return undefined;
          }
          const value = Reflect.get(current, prop);
          return {
            configurable: true,
            enumerable: true,
            writable: false,
            value:
              typeof value === 'object' && value !== null && !Array.isArray(value)
                ? live([...path, prop])
                : value,
          };
        },
        has(_target, prop) {
          const current = walk(getNamespaceBundle<T>(namespace), path);
          return Boolean(current && typeof current === 'object' && prop in current);
        },
      },
    );

  return live() as T;
}

export function currentLanguage(): AppLanguage {
  if (!i18nInstance.isInitialized) {
    return DEFAULT_LANGUAGE;
  }
  const value = i18nInstance.resolvedLanguage ?? i18nInstance.language;
  return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
}
