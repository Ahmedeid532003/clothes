import type { AuthUser } from '@/lib/api/auth';

const PAGE_ALIASES: Record<string, string[]> = {
  'general-expenses': ['expense-vouchers', 'expense-types'],
  'payroll-advances': ['payroll-payments', 'payroll'],
  'payment-cheques': ['cheques'],
  'reorder-alerts': ['purchase-invoices'],
  'purchase-orders': ['purchase-invoices'],
  'purchase-invoices': ['reorder-alerts', 'purchase-orders'],
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
