import type { CustomerReservationDto, SalesQuotationDto } from '@/lib/api/sales';
import type { PosCartLine, PosCustomerSaleDto } from '@/lib/api/pos';

export const HELD_KEY = 'mahaly-pos-barcode-held';

export type HeldCartRow = {
  id: string;
  label: string;
  customerId?: string;
  customerName?: string;
  invoiceDiscount?: string;
  deliveryFees?: string;
  lines: PosCartLine[];
};

export type CustomerDocKind = 'reservation' | 'quotation' | 'held' | 'sale';

export type CustomerDocOption = {
  id: string;
  kind: CustomerDocKind;
  code: string;
  label: string;
  total: string;
  lineCount: number;
  createdAt: string;
  reservation?: CustomerReservationDto;
  quotation?: SalesQuotationDto;
  held?: HeldCartRow;
  sale?: PosCustomerSaleDto;
};

export function readHeldCarts(): HeldCartRow[] {
  try {
    const raw = localStorage.getItem(HELD_KEY);
    return raw ? (JSON.parse(raw) as HeldCartRow[]) : [];
  } catch {
    return [];
  }
}

export function writeHeldCarts(rows: HeldCartRow[]) {
  localStorage.setItem(HELD_KEY, JSON.stringify(rows.slice(0, 10)));
}

export function heldCartsForCustomer(customerId: string): HeldCartRow[] {
  return readHeldCarts().filter((h) => h.customerId === customerId && (h.lines?.length || 0) > 0);
}

export function buildCustomerDocOptions(
  reservations: CustomerReservationDto[],
  quotations: SalesQuotationDto[],
  held: HeldCartRow[],
  sales: PosCustomerSaleDto[] = [],
): CustomerDocOption[] {
  const options: CustomerDocOption[] = [];

  for (const r of reservations) {
    if (!r.lines?.length) continue;
    options.push({
      id: r.id,
      kind: 'reservation',
      code: r.code,
      label: r.code,
      total: r.total,
      lineCount: r.lines.length,
      createdAt: r.created_at,
      reservation: r,
    });
  }

  for (const q of quotations) {
    if (!q.lines?.length) continue;
    options.push({
      id: q.id,
      kind: 'quotation',
      code: q.code,
      label: q.code,
      total: q.total,
      lineCount: q.lines.length,
      createdAt: q.created_at,
      quotation: q,
    });
  }

  for (const h of held) {
    options.push({
      id: h.id,
      kind: 'held',
      code: h.label,
      label: h.label,
      total: String(
        h.lines.reduce((s, ln) => {
          const q = parseFloat(ln.quantity) || 0;
          const p = parseFloat(ln.unit_price) || 0;
          const d = parseFloat(ln.discount_percent) || 0;
          return s + q * p * (1 - d / 100);
        }, 0),
      ),
      lineCount: h.lines.length,
      createdAt: h.label,
      held: h,
    });
  }

  for (const s of sales) {
    if (!s.lines?.length) continue;
    options.push({
      id: s.id,
      kind: 'sale',
      code: s.code,
      label: s.code,
      total: s.total,
      lineCount: s.lines.length,
      createdAt: s.created_at,
      sale: s,
    });
  }

  const priority = { reservation: 0, quotation: 1, held: 2, sale: 3 };
  return options.sort((a, b) => {
    const pa = priority[a.kind];
    const pb = priority[b.kind];
    if (pa !== pb) return pa - pb;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
