import type { ReorderAlertItem } from '@/lib/api/reorderAlerts';

export function soldPercent(item: ReorderAlertItem): number {
  const purchased = Number(item.purchased_qty) || 0;
  const sold = Number(item.sold_qty) || 0;
  if (purchased <= 0) return 0;
  return Math.min(100, Math.round((sold / purchased) * 100));
}

export function thresholdPercent(item: ReorderAlertItem): number {
  return Number(item.reorder_percent) || 0;
}

export type SupplierGroup = {
  supplierId: string;
  supplierName: string;
  items: ReorderAlertItem[];
};

export function groupBySupplier(items: ReorderAlertItem[]): SupplierGroup[] {
  const map = new Map<string, ReorderAlertItem[]>();
  for (const item of items) {
    const key = item.supplier_id || item.supplier_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([supplierId, groupItems]) => ({
    supplierId,
    supplierName: groupItems[0]?.supplier_name ?? '—',
    items: groupItems,
  }));
}
