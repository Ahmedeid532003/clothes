/** ERP supplier tabs ↔ original V13 suppliers sub-menus (6 branches). */

export const SUPPLIERS_CANVAS_SUBTABS = [
  'supplier-categories',
  'supplier-data',
  'sale-discount-note',
  'supplier-discount-note',
  'supplier-payments',
  'supplier-reports',
] as const;

export type SuppliersCanvasSubTab = (typeof SUPPLIERS_CANVAS_SUBTABS)[number];

const ERP_TO_SUB: Record<string, SuppliersCanvasSubTab> = {
  'supplier-categories': 'supplier-categories',
  'supplier-types': 'supplier-categories',
  'supplier-groups': 'supplier-categories',
  'supplier-data': 'supplier-data',
  suppliers: 'supplier-data',
  'sale-discount-note': 'sale-discount-note',
  'store-discounts': 'sale-discount-note',
  'supplier-discount-note': 'supplier-discount-note',
  'supplier-discounts': 'supplier-discount-note',
  'supplier-payments': 'supplier-payments',
  'supplier-reports': 'supplier-reports',
  'supplier-weekly-reports': 'supplier-reports',
  'supplier-accounts': 'supplier-reports',
  'supplier-inventories': 'supplier-reports',
  'general-item-movement': 'supplier-reports',
};

export function isSuppliersCanvasRoute(tab: string): boolean {
  return tab in ERP_TO_SUB;
}

export function suppliersTabToSubTab(tab: string): SuppliersCanvasSubTab {
  return ERP_TO_SUB[tab] ?? 'supplier-data';
}

export function suppliersSubTabToErpTab(sub: string): string {
  switch (sub) {
    case 'supplier-categories':
      return 'supplier-categories';
    case 'supplier-data':
      return 'supplier-data';
    case 'sale-discount-note':
      return 'sale-discount-note';
    case 'supplier-discount-note':
      return 'supplier-discount-note';
    case 'supplier-payments':
      return 'supplier-payments';
    case 'supplier-reports':
      return 'supplier-reports';
    default:
      return 'supplier-data';
  }
}
