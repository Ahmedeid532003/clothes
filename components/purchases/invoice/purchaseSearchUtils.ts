import type { PurchaseProductSearchRow } from '@/lib/api/purchases';

export function searchTokens(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean);
}

export function productSearchHaystack(p: PurchaseProductSearchRow): string {
  return [
    p.code,
    p.barcode,
    p.name_ar,
    p.name_en,
    p.description,
    p.brand_name,
    p.supplier_name,
    p.season_name,
    p.section_name,
    p.classification_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function productMatchesAllTokens(p: PurchaseProductSearchRow, tokens: string[]): boolean {
  if (!tokens.length) return false;
  const hay = productSearchHaystack(p);
  return tokens.every((tok) => hay.includes(tok.toLowerCase()));
}

/** هل يوجد صنف قابل للإضافة للفاتورة يطابق كل كلمات البحث؟ */
export function hasInvoiceMatchForQuery(
  results: PurchaseProductSearchRow[],
  query: string,
): boolean {
  const tokens = searchTokens(query);
  if (!tokens.length) return false;
  return results.some((p) => p.matches_invoice && productMatchesAllTokens(p, tokens));
}

export function prefillProductFromSearch(query: string): {
  code: string;
  name_ar: string;
  description: string;
} {
  const trimmed = query.trim();
  const parts = searchTokens(trimmed);
  const first = parts[0] ?? '';
  const looksLikeModel = /^[\dA-Za-z][\dA-Za-z\-_.]*$/.test(first);
  if (looksLikeModel && parts.length > 1) {
    return {
      code: first,
      name_ar: parts.slice(1).join(' '),
      description: trimmed,
    };
  }
  if (looksLikeModel && parts.length === 1) {
    return { code: first, name_ar: '', description: trimmed };
  }
  return { code: '', name_ar: trimmed, description: trimmed };
}
