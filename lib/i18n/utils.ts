import type { TranslationDict } from './types';

export function getNestedValue(
  dict: TranslationDict,
  path: string
): string | undefined {
  const keys = path.split('.');
  let current: string | TranslationDict | undefined = dict;

  for (const key of keys) {
    if (current === undefined || typeof current === 'string') return undefined;
    current = current[key];
  }

  return typeof current === 'string' ? current : undefined;
}

export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    String(params[key] ?? `{${key}}`)
  );
}
