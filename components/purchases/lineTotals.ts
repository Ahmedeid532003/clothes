import type { InvoiceLineDraft } from './types';

export function calcLineTotals(
  ln: Pick<
    InvoiceLineDraft,
    'quantity' | 'unit_cost' | 'discount_type' | 'discount_percent' | 'discount_amount' | 'tax_percent'
  >,
) {
  const q = parseFloat(ln.quantity) || 0;
  const cost = parseFloat(ln.unit_cost) || 0;
  const gross = q * cost;
  let net = gross;
  if (ln.discount_type === 'amount') {
    net = Math.max(0, gross - (parseFloat(ln.discount_amount) || 0));
  } else {
    const disc = parseFloat(ln.discount_percent) || 0;
    net = gross * (1 - disc / 100);
  }
  const taxP = parseFloat(ln.tax_percent) || 0;
  const tax = net * (taxP / 100);
  return { net, tax, total: net + tax, gross };
}

export function suggestedSalePrice(unitCost: string, markupPercent: string): number {
  const cost = parseFloat(unitCost) || 0;
  const markup = parseFloat(markupPercent) || 0;
  return cost * (1 + markup / 100);
}
