export type SupplierPrefill = {
  entity_kind?: string;
  settlement_mode?: string;
};

const STORAGE_KEY = 'supplierPrefill';

export function navigateToSuppliersWithPrefill(prefill: SupplierPrefill) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefill));
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'suppliers' }));
}

export function consumeSupplierPrefill(): SupplierPrefill | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as SupplierPrefill;
  } catch {
    return null;
  }
}
