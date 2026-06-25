import type {
  PosCompositeHit,
  PosProductHit,
  PosSearchResult,
  PosSellerDto,
  PosVariantHit,
} from '@/lib/api/pos';
import type { usePosSession } from './usePosSession';

type Session = ReturnType<typeof usePosSession>;

export type PendingPosLine =
  | {
      kind: 'variant';
      product: PosProductHit;
      variant: PosVariantHit;
      displayLabel: string;
    }
  | {
      kind: 'composite';
      composite: PosCompositeHit;
      displayLabel: string;
    };

export function resolveSearchToLine(
  results: PosSearchResult,
  bundleLabel: string,
): PendingPosLine | null {
  if (results.composites.length === 1 && results.products.length === 0) {
    const c = results.composites[0];
    return {
      kind: 'composite',
      composite: c,
      displayLabel: `${bundleLabel}: ${c.name_ar}`,
    };
  }

  if (results.products.length === 0) return null;

  const product = results.products[0];
  const variants = product.variants || [];
  if (variants.length === 0) return null;

  const variant =
    variants.find((v) => (parseFloat(v.quantity_available) || 0) > 0) || variants[0];

  if (!variant?.variant_id) return null;

  return {
    kind: 'variant',
    product,
    variant,
    displayLabel: `${product.name_ar} — ${variant.size_name}/${variant.color_name}`,
  };
}

export function addPendingLine(
  session: Session,
  line: PendingPosLine,
  seller?: PosSellerDto,
) {
  if (line.kind === 'composite') {
    session.addComposite(
      line.composite,
      line.displayLabel,
      seller?.id,
      seller?.full_name,
    );
    return;
  }
  session.addVariant(
    line.product,
    line.variant,
    seller?.id,
    seller?.full_name,
  );
}

export async function resolveSellerCode(
  code: string,
  employees: PosSellerDto[],
  lookup: (c: string) => Promise<PosSellerDto>,
  scanOrderLookup: (c: string) => Promise<{ id: string; employee_code: string; full_name: string }>,
): Promise<PosSellerDto | null> {
  const c = code.trim();
  if (!c) return null;

  const local =
    employees.find(
      (e) =>
        e.employee_code.toLowerCase() === c.toLowerCase() ||
        (e.username || '').toLowerCase() === c.toLowerCase() ||
        e.id === c,
    ) || null;
  if (local) return local;

  try {
    return await lookup(c);
  } catch {
    /* try scan-order employee API */
  }

  try {
    const emp = await scanOrderLookup(c);
    return {
      id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
    };
  } catch {
    return null;
  }
}
