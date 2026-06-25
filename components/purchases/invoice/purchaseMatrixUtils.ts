import type { CatalogItem } from '@/lib/api/inventory';
import type { PurchaseProductSearchRow } from '@/lib/api/purchases';

export function productNeedsMatrix(product: PurchaseProductSearchRow): boolean {
  const variants = product.variants ?? [];
  if (variants.length <= 1) return false;
  const sizeIds = new Set(variants.map((v) => v.size).filter(Boolean));
  const colorIds = new Set(variants.map((v) => v.color).filter(Boolean));
  return variants.length > 1 || sizeIds.size > 1 || colorIds.size > 1;
}

export function productMatrixAxes(
  product: PurchaseProductSearchRow,
  allSizes: CatalogItem[],
  allColors: CatalogItem[],
): { sizes: CatalogItem[]; colors: CatalogItem[] } {
  const sizeIds = new Set<string>();
  const colorIds = new Set<string>();
  for (const v of product.variants ?? []) {
    if (v.size) sizeIds.add(v.size);
    if (v.color) colorIds.add(v.color);
  }
  const sizes = allSizes.filter((s) => sizeIds.has(s.id));
  const colors = allColors.filter((c) => colorIds.has(c.id));
  return {
    sizes: sizes.length ? sizes : allSizes,
    colors: colors.length ? colors : allColors,
  };
}
