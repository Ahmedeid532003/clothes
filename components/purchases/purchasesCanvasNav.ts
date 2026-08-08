/** ERP tab keys ↔ original purchases-v13 sub-tabs (6 branches). */

export const PURCHASES_CANVAS_TABS = [
  'purchase-invoices',
  'purchase-returns',
  'purchase-alerts',
  'purchase-orders',
  'shipping-companies',
  'purchase-reports',
] as const;

export type PurchasesCanvasTab = (typeof PURCHASES_CANVAS_TABS)[number];

/** Legacy ERP tabs that should open the same canvas branch. */
const LEGACY_TAB_MAP: Record<string, PurchasesCanvasTab> = {
  'purchase-return-invoices': 'purchase-returns',
  'reorder-alerts': 'purchase-alerts',
  purchasesWorkspace: 'purchase-invoices',
};

export function isPurchasesCanvasRoute(tab: string): boolean {
  if ((PURCHASES_CANVAS_TABS as readonly string[]).includes(tab)) return true;
  return tab in LEGACY_TAB_MAP;
}

export function purchasesTabToSubTab(tab: string): PurchasesCanvasTab {
  if ((PURCHASES_CANVAS_TABS as readonly string[]).includes(tab)) {
    return tab as PurchasesCanvasTab;
  }
  return LEGACY_TAB_MAP[tab] ?? 'purchase-invoices';
}

export function purchasesSubTabToErpTab(subTab: string): string {
  if ((PURCHASES_CANVAS_TABS as readonly string[]).includes(subTab)) return subTab;
  return 'purchase-invoices';
}
