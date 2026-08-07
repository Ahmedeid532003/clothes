export type ProductModuleSubTabId =
  | 'product-categories'
  | 'products-list'
  | 'composite-items'
  | 'bundled-items'
  | 'item-transfer'
  | 'item-issue'
  | 'item-addition'
  | 'item-destruction'
  | 'price-modification'
  | 'inventory-check'
  | 'barcode-printing'
  | 'product-reports-shortcut';

export const PRODUCT_MODULE_SUBMENUS: {
  id: ProductModuleSubTabId;
  labelEn: string;
  labelAr: string;
}[] = [
  { id: 'product-categories', labelEn: 'Product Classifications', labelAr: 'تصنيفات المنتجات' },
  { id: 'products-list', labelEn: 'Products Registry', labelAr: 'المنتجات' },
  { id: 'composite-items', labelEn: 'Composite Items', labelAr: 'أصناف مركبة' },
  { id: 'bundled-items', labelEn: 'Bundled Items', labelAr: 'صنف مجمع' },
  { id: 'item-transfer', labelEn: 'Item Transfer Orders', labelAr: 'اذون تحويل اصناف' },
  { id: 'item-issue', labelEn: 'Item Issue Vouchers', labelAr: 'اذون صرف' },
  { id: 'item-addition', labelEn: 'Item Addition Vouchers', labelAr: 'اذون اضافه' },
  { id: 'item-destruction', labelEn: 'Destruction Vouchers', labelAr: 'اذون اهلاك' },
  { id: 'price-modification', labelEn: 'Modify Selling Prices', labelAr: 'تعديل اسعار البيع' },
  { id: 'inventory-check', labelEn: 'Inventory Check', labelAr: 'جرد اصناف' },
  { id: 'barcode-printing', labelEn: 'Print Barcode', labelAr: 'طباعة باركود' },
  { id: 'product-reports-shortcut', labelEn: 'Product Reports', labelAr: 'تقارير المنتجات' },
];

const PRODUCT_MODULE_ROUTE_IDS = new Set<string>([
  'product',
  'product-management',
  ...PRODUCT_MODULE_SUBMENUS.map((m) => m.id),
]);

export function isProductModuleRoute(tab: string): boolean {
  return PRODUCT_MODULE_ROUTE_IDS.has(tab);
}

export function isProductModuleNavOnly(tab: string): boolean {
  return tab === 'product' || tab === 'product-management';
}

export function tabToProductModuleSubTab(tab: string): ProductModuleSubTabId {
  if (PRODUCT_MODULE_SUBMENUS.some((m) => m.id === tab)) {
    return tab as ProductModuleSubTabId;
  }
  return 'products-list';
}
