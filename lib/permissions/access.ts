import type { AuthUser } from '@/lib/api/auth';
import { isProductModuleRoute } from '@/components/product/productModuleNav';
import { isPurchasesCanvasRoute } from '@/components/purchases/purchasesCanvasNav';
import { isEmployeesCanvasRoute } from '@/components/hr/employeesCanvasNav';

const PAGE_ALIASES: Record<string, string[]> = {
  'inventory-management': [
    'products',
    'seasons',
    'warehouses',
    'stock-balances',
    'stock-transfers',
    'stock-disbursements',
    'stock-additions',
    'stock-scrap',
    'stock-valuation',
    'stock-count',
    'composite-products',
    'product-sections',
    'brands',
    'classifications',
    'sizes',
    'colors',
  ],
  'mgmt-dashboard': ['inventory-management', 'products', 'stock-balances'],
  'mgmt-setup': [
    'inventory-management',
    'seasons',
    'product-sections',
    'brands',
    'classifications',
    'sizes',
    'colors',
  ],
  'mgmt-catalog': ['inventory-management', 'products', 'composite-products'],
  'mgmt-inventory': ['inventory-management', 'warehouses', 'stock-balances', 'stock-valuation'],
  'mgmt-permits': [
    'inventory-management',
    'stock-transfers',
    'stock-disbursements',
    'stock-additions',
    'stock-scrap',
  ],
  'mgmt-audit': ['inventory-management', 'stock-count'],
  'mgmt-style-builder': ['inventory-management', 'composite-products', 'products'],
  'product-categories': [
    'inventory-management',
    'product-sections',
    'brands',
    'classifications',
    'sizes',
    'colors',
    'mgmt-setup',
  ],
  'products-list': ['inventory-management', 'products', 'mgmt-catalog'],
  'composite-items': ['inventory-management', 'composite-products', 'mgmt-style-builder'],
  'bundled-items': ['inventory-management', 'composite-products', 'products'],
  'item-transfer': ['inventory-management', 'stock-transfers', 'mgmt-permits'],
  'item-issue': ['inventory-management', 'stock-disbursements', 'mgmt-permits'],
  'item-addition': ['inventory-management', 'stock-additions', 'mgmt-permits'],
  'item-destruction': ['inventory-management', 'stock-scrap', 'mgmt-permits'],
  'price-modification': ['inventory-management', 'price-adjustments'],
  'inventory-check': ['inventory-management', 'stock-count', 'mgmt-audit', 'mgmt-inventory'],
  'barcode-printing': ['inventory-management', 'barcode-print'],
  'product-reports-shortcut': ['inventory-management', 'products', 'mgmt-dashboard'],
  'general-expenses': ['expense-vouchers', 'expense-types'],
  'payroll-advances': ['payroll-payments', 'payroll'],
  'payment-cheques': ['cheques'],
  'reorder-alerts': ['purchase-invoices', 'purchase-alerts'],
  'purchase-orders': ['purchase-invoices'],
  'purchase-invoices': ['reorder-alerts', 'purchase-orders', 'purchase-returns', 'purchase-alerts', 'shipping-companies', 'purchase-reports'],
  'purchase-returns': ['purchase-invoices', 'purchase-return-invoices'],
  'purchase-alerts': ['purchase-invoices', 'reorder-alerts'],
  'shipping-companies': ['purchase-invoices'],
  'purchase-reports': ['purchase-invoices'],
  'purchase-return-invoices': ['purchase-returns', 'purchase-invoices'],
  'general-item-movement': ['supplier-inventories'],
  'supplier-inventories': ['general-item-movement'],
  'customer-stock-count': ['customer-consignment'],
  'customer-consignment': ['customer-stock-count'],
  'supplier-discounts': ['price-adjustments'],
  'store-discounts': ['price-adjustments'],
};

export function canViewPage(user: AuthUser | null, pageKey: string): boolean {
  if (!user) return false;
  if (user.is_owner) return true;
  if (pageKey === 'home' || pageKey === 'profile' || pageKey === 'product' || pageKey === 'product-management') return true;
  if (isProductModuleRoute(pageKey)) return true;
  if (isPurchasesCanvasRoute(pageKey)) return true;
  if (isEmployeesCanvasRoute(pageKey)) return true;
  const aliases = PAGE_ALIASES[pageKey];
  if (aliases) return aliases.some((key) => !!user.permissions?.pages?.[key]);
  return !!user.permissions?.pages?.[pageKey];
}

export function canUseFeature(
  user: AuthUser | null,
  pageKey: string,
  featureKey: string,
): boolean {
  if (!user) return false;
  if (user.is_owner) return true;
  if (!canViewPage(user, pageKey)) return false;
  return !!user.permissions?.features?.[pageKey]?.[featureKey];
}

export function canPerformAction(
  user: AuthUser | null,
  pageKey: string,
  action: 'view' | 'update' | 'delete',
): boolean {
  if (!user) return false;
  if (user.is_owner) return true;
  return !!user.permissions?.actions?.[pageKey]?.[action];
}

export function firstAllowedTab(user: AuthUser | null, candidates: string[]): string | null {
  for (const tab of candidates) {
    if (canViewPage(user, tab)) return tab;
  }
  return null;
}
