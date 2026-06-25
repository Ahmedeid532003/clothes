export type MoneyLocale = 'ar' | 'en';

/** Keep digits + one decimal point, max 2 fraction digits. No float math. */
export function normalizeMoneyAmount(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return '';

  const firstDot = cleaned.indexOf('.');
  let intPart: string;
  let decPart: string;

  if (firstDot === -1) {
    intPart = cleaned;
    decPart = '';
  } else {
    intPart = cleaned.slice(0, firstDot);
    decPart = cleaned.slice(firstDot + 1).replace(/\./g, '');
  }

  intPart = intPart.replace(/^0+(?=\d)/, '');
  if (!intPart && (decPart || cleaned.includes('.'))) intPart = '0';
  decPart = decPart.slice(0, 2);

  if (cleaned.endsWith('.') && !decPart) return `${intPart || '0'}.`;
  if (decPart) return `${intPart || '0'}.${decPart}`;
  return intPart;
}

/** Parse money string safely (max 2 decimals) without IEEE float input bugs. */
export function parseMoneyAmount(raw: string): number {
  const normalized = normalizeMoneyAmount(raw).replace(/\.$/, '');
  if (!normalized) return 0;
  const [intPart, decPart = '0'] = normalized.split('.');
  const intVal = Number(intPart || '0');
  const decVal = Number((decPart + '00').slice(0, 2));
  return intVal + decVal / 100;
}

export function isPositiveMoneyAmount(raw: string): boolean {
  return parseMoneyAmount(raw) > 0;
}

export function formatMoneyLocale(
  value: string | number | undefined,
  locale: MoneyLocale = 'ar',
): string {
  const normalized = normalizeMoneyAmount(String(value ?? '').replace(/,/g, '')).replace(/\.$/, '');
  if (!normalized) {
    return locale === 'ar' ? '٠٫٠٠' : '0.00';
  }

  const [intPart, decPart = ''] = normalized.split('.');
  const main = Number(intPart || '0').toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  });
  const decimal = (decPart + '00').slice(0, 2).padEnd(2, '0');
  const separator = locale === 'ar' ? '٫' : '.';
  return `${main}${separator}${decimal}`;
}

export function splitMoneyHero(value: string | number | undefined, locale: MoneyLocale = 'ar') {
  const formatted = formatMoneyLocale(value, locale);
  const separator = locale === 'ar' ? '٫' : '.';
  const idx = formatted.lastIndexOf(separator);
  if (idx === -1) return { main: formatted, decimal: locale === 'ar' ? '٠٠' : '00' };
  return {
    main: formatted.slice(0, idx),
    decimal: formatted.slice(idx + 1),
  };
}

export function toApiMoneyAmount(raw: string): string {
  return normalizeMoneyAmount(raw).replace(/\.$/, '');
}
