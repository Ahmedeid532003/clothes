import type { PosCartLine, PosProductHit } from '@/lib/api/pos';

const TILE_GRADIENTS = [
  'from-violet-500 to-indigo-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-fuchsia-500 to-purple-600',
  'from-cyan-500 to-sky-600',
  'from-lime-500 to-green-600',
];

export function productTileGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % TILE_GRADIENTS.length;
  return TILE_GRADIENTS[hash];
}

export function productInitials(name: string, code: string) {
  const src = (name || code || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export type PosGalleryItem = {
  key: string;
  product: PosProductHit;
  variant: PosProductHit['variants'][0];
};

export function flattenGalleryItems(products: PosProductHit[]): PosGalleryItem[] {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({
      key: `${product.id}:${variant.variant_id}`,
      product,
      variant,
    })),
  );
}

export function lineSubtotal(qty: string, price: string, discount = '0', discountAmount = '0') {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(price) || 0;
  const d = parseFloat(discount) || 0;
  const da = parseFloat(discountAmount) || 0;
  return Math.max(q * p * (1 - d / 100) - da, 0);
}

export function lineGross(qty: string, price: string) {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(price) || 0;
  return q * p;
}

export function lineDiscountAmount(
  qty: string,
  price: string,
  discount = '0',
  discountAmount = '0',
) {
  const gross = lineGross(qty, price);
  const net = lineSubtotal(qty, price, discount, discountAmount);
  return Math.max(gross - net, 0);
}

/** معرّف محلي — يعمل على HTTP والمتصفحات القديمة (بدون crypto.randomUUID) */
let _localIdSeq = 0;
export function newLocalId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _localIdSeq += 1;
  return `${prefix}-${Date.now()}-${_localIdSeq}-${Math.random().toString(36).slice(2, 9)}`;
}

/** تحليل مبلغ من حقل إدخال — يدعم الأرقام العربية والإنجليزية */
export function parsePosAmount(v: string): number {
  let s = String(v ?? '')
    .replace(/[٠-٩]/g, (ch) => {
      const i = '٠١٢٣٤٥٦٧٨٩'.indexOf(ch);
      return i >= 0 ? String(i) : ch;
    })
    .replace(/,/g, '')
    .trim();
  const dots = s.split('.');
  if (dots.length > 2) s = `${dots[0]}.${dots.slice(1).join('')}`;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** عرض مبالغ نقطة البيع بدون كسور — مثل واجهة البيع بالباركود */
export function fmtPosAmount(value: number) {
  if (!Number.isFinite(value)) return '0';
  const n = Math.round(value);
  return n.toLocaleString('en-US');
}

/** يحدّث سطر السلة ببائع — مع تسمية العرض */
export function applySellerToCartLine(
  line: PosCartLine,
  seller?: { id: string; full_name: string },
): PosCartLine {
  if (!seller) return line;
  const sellerSuffix = ` [${seller.full_name}]`;
  const baseLabel = line.product_name
    ? `${line.product_name}${line.size_name ? ` — ${line.size_name}/${line.color_name}` : ''}`
    : line.label.replace(/\s*\[[^\]]+\]$/, '');
  const sellerKey = seller.id ? `:s${seller.id}` : '';
  const baseKey = line.key.replace(/:s[^:]+$/, '').replace(/#[^#]+#\d+$/, '');
  return {
    ...line,
    key: `${baseKey}${sellerKey}`,
    seller_id: seller.id,
    seller_name: seller.full_name,
    label: `${baseLabel}${sellerSuffix}`,
  };
}

export function lineStockDeficit(line: PosCartLine): number {
  const need = parseFloat(line.quantity) || 0;
  const avail = parseFloat(line.available) || 0;
  return Math.max(need - avail, 0);
}

export function cartShortageLines(cart: PosCartLine[]) {
  return cart
    .filter((l) => l.kind === 'variant' && l.variant && lineStockDeficit(l) > 0)
    .map((l) => ({
      key: l.key,
      variant: l.variant!,
      label: l.label,
      quantity: parseFloat(l.quantity) || 0,
      available: parseFloat(l.available) || 0,
      deficit: lineStockDeficit(l),
    }));
}

export function cartHasStockShortage(cart: PosCartLine[]): boolean {
  return cart.some((l) => lineStockDeficit(l) > 0);
}
