import { appNavigate } from '@/components/accounting/AccountingUi';

export const PAPER_PAYMENT_METHODS = ['cheque', 'promissory_note', 'other_papers'] as const;

export type PaperPaymentMethod = (typeof PAPER_PAYMENT_METHODS)[number];

export function isPaperPaymentMethod(method: string): method is PaperPaymentMethod {
  return (PAPER_PAYMENT_METHODS as readonly string[]).includes(method);
}

export type PaymentChequesNavMeta = {
  highlight?: string;
  source?: 'supplier' | 'manual' | '';
  status?: string;
};

const NAV_KEY = 'payment-cheques-nav';

export function navigateToPaymentCheques(meta?: PaymentChequesNavMeta) {
  if (meta) sessionStorage.setItem(NAV_KEY, JSON.stringify(meta));
  appNavigate('payment-cheques');
}

export function consumePaymentChequesNavMeta(): PaymentChequesNavMeta | null {
  const raw = sessionStorage.getItem(NAV_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(NAV_KEY);
  try {
    return JSON.parse(raw) as PaymentChequesNavMeta;
  } catch {
    return null;
  }
}
