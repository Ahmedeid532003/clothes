import { apiFetch } from './client';

export type CatalogItem = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type WarehouseDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  manager_name: string;
  primary_branch: string | null;
  primary_branch_name?: string;
  is_sale_outlet?: boolean;
  is_active: boolean;
};

export type SeasonDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_open: boolean;
  is_current: boolean;
  starts_at: string | null;
  ends_at: string | null;
  barcode_prefix?: string;
  barcode_next_number?: number;
};

export type InventorySettingsDto = {
  default_reorder_percent: string;
  transfer_requires_approval?: boolean;
  pos_force_return_from_invoice?: boolean;
  pos_require_seller_on_scan?: boolean;
  pos_commission_basis?: 'seller' | 'product';
  pos_allow_multiple_sellers?: boolean;
  updated_at?: string;
};

export type ProductDto = {
  id: string;
  code: string;
  barcode: string;
  name_ar: string;
  name_en: string;
  description?: string;
  brand: string | null;
  section: string | null;
  classification: string | null;
  supplier: string | null;
  season: string;
  brand_name?: string;
  section_name?: string;
  supplier_name?: string;
  classification_name?: string;
  season_name?: string;
  purchase_price: string;
  markup_percent: string;
  sale_price: string;
  offer_price: string | null;
  reorder_percent: string;
  is_active: boolean;
  variants?: Array<{
    id: string;
    size: string;
    color: string;
    size_name: string;
    color_name: string;
    barcode?: string;
  }>;
};

export type StockBalanceDto = {
  id: string;
  warehouse: string;
  variant: string;
  warehouse_code: string;
  warehouse_name: string;
  product_code: string;
  product_name: string;
  size_name: string;
  color_name: string;
  quantity: string;
  purchase_price: string;
  sale_price: string;
  offer_price: string | null;
};

export type StockTransferLineDto = {
  variant: string;
  quantity: string;
  product_code?: string;
  product_name?: string;
  size_name?: string;
  color_name?: string;
};

export type StockTransferDto = {
  id: string;
  code: string;
  transfer_type: string;
  from_warehouse: string;
  to_warehouse: string;
  from_branch: string | null;
  to_branch: string | null;
  from_warehouse_name: string;
  to_warehouse_name: string;
  from_branch_name?: string;
  to_branch_name?: string;
  status: string;
  requires_approval: boolean;
  notes: string;
  lines: StockTransferLineDto[];
  created_at: string;
  approved_at?: string | null;
};

export type StockTransferOptions = {
  transfer_types: Array<{ key: string; label_ar: string }>;
  warehouses: Array<{
    id: string;
    code: string;
    name_ar: string;
    is_branch_sale: boolean;
  }>;
  branches: Array<{
    id: string;
    code: string;
    name_ar: string;
    sale_warehouse_id: string;
    sale_warehouse_name: string;
  }>;
  transfer_requires_approval: boolean;
  can_approve: boolean;
};

export type StockScrapDto = {
  id: string;
  code: string;
  warehouse: string;
  warehouse_name: string;
  reason: string;
  status: string;
  lines: StockTransferLineDto[];
  created_at: string;
};

function catalogApi(base: string) {
  return {
    list: () => apiFetch<CatalogItem[]>(`${base}/`),
    create: (payload: Record<string, unknown>) =>
      apiFetch<CatalogItem>(`${base}/`, { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Record<string, unknown>) =>
      apiFetch<CatalogItem>(`${base}/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (id: string) => apiFetch<void>(`${base}/${id}/`, { method: 'DELETE' }),
  };
}

export const productSectionsApi = catalogApi('/inventory/sections');
export const brandsApi = catalogApi('/inventory/brands');
export const classificationsApi = catalogApi('/inventory/classifications');
export const sizesApi = catalogApi('/inventory/sizes');
export const colorsApi = catalogApi('/inventory/colors');
export const supplierTypesApi = catalogApi('/inventory/supplier-types');
export const supplierGroupsApi = catalogApi('/inventory/supplier-groups');
export const supplierCategoriesApi = catalogApi('/inventory/supplier-categories');
export const supplierDepartmentsApi = catalogApi('/inventory/supplier-departments');

export async function fetchWarehouses(): Promise<WarehouseDto[]> {
  return apiFetch<WarehouseDto[]>('/organization/warehouses/');
}

export async function createWarehouse(payload: Record<string, unknown>): Promise<WarehouseDto> {
  return apiFetch<WarehouseDto>('/organization/warehouses/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWarehouse(id: string, payload: Record<string, unknown>): Promise<WarehouseDto> {
  return apiFetch<WarehouseDto>(`/organization/warehouses/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteWarehouse(id: string): Promise<void> {
  await apiFetch<void>(`/organization/warehouses/${id}/`, { method: 'DELETE' });
}

export async function fetchSeasons(): Promise<SeasonDto[]> {
  return apiFetch<SeasonDto[]>('/organization/seasons/');
}

export async function createSeason(payload: Record<string, unknown>): Promise<SeasonDto> {
  return apiFetch<SeasonDto>('/organization/seasons/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSeason(id: string, payload: Record<string, unknown>): Promise<SeasonDto> {
  return apiFetch<SeasonDto>(`/organization/seasons/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchProducts(): Promise<ProductDto[]> {
  return apiFetch<ProductDto[]>('/inventory/products/');
}

export async function createProduct(payload: Record<string, unknown>): Promise<ProductDto> {
  return apiFetch<ProductDto>('/inventory/products/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(id: string, payload: Record<string, unknown>): Promise<ProductDto> {
  return apiFetch<ProductDto>(`/inventory/products/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch<void>(`/inventory/products/${id}/`, { method: 'DELETE' });
}

export async function fetchProduct(id: string): Promise<ProductDto> {
  return apiFetch<ProductDto>(`/inventory/products/${id}/`);
}

export async function fetchNextBarcode(params?: {
  season?: string;
  size?: string;
  color?: string;
}): Promise<{
  barcode: string;
  season_id: string;
  barcode_prefix: string;
  size_code?: string | null;
  color_code?: string | null;
}> {
  const sp = new URLSearchParams();
  if (params?.season) sp.set('season', params.season);
  if (params?.size) sp.set('size', params.size);
  if (params?.color) sp.set('color', params.color);
  const qs = sp.toString();
  return apiFetch(qs ? `/inventory/products/next-barcode/?${qs}` : '/inventory/products/next-barcode/');
}

export type BarcodePreviewRow = {
  size_id?: string;
  color_id?: string;
  size_code?: string;
  color_code?: string;
  size_name?: string;
  color_name?: string;
  barcode_preview: string;
  prefix?: string;
};

export async function fetchBarcodePreviews(params: {
  season: string;
  sizes: string[];
  colors: string[];
}): Promise<{ rows: BarcodePreviewRow[] }> {
  const sp = new URLSearchParams();
  sp.set('season', params.season);
  if (params.sizes.length) sp.set('sizes', params.sizes.join(','));
  if (params.colors.length) sp.set('colors', params.colors.join(','));
  return apiFetch(`/inventory/products/barcode-preview/?${sp.toString()}`);
}

export async function fetchInventorySettings(): Promise<InventorySettingsDto> {
  return apiFetch<InventorySettingsDto>('/inventory/inventory-settings/');
}

export async function updateInventorySettings(
  payload: Partial<InventorySettingsDto>,
): Promise<InventorySettingsDto> {
  return apiFetch<InventorySettingsDto>('/inventory/inventory-settings/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchStockBalances(warehouseId?: string): Promise<StockBalanceDto[]> {
  const url = warehouseId
    ? `/inventory/stock-balances/?warehouse=${warehouseId}`
    : '/inventory/stock-balances/';
  return apiFetch<StockBalanceDto[]>(url);
}

export type SupplierListFilters = {
  entity_kind?: string;
  settlement_mode?: string;
  supplier_type?: string;
  supplier_group?: string;
};

export type SupplierDto = CatalogItem & {
  supplier_type: string;
  supplier_group: string;
  supplier_type_name?: string;
  supplier_group_name?: string;
  supplier_type_kind?: string;
  supplier_group_mode?: string;
  supplier_category?: string | null;
  supplier_department?: string | null;
  supplier_category_name?: string;
  supplier_department_name?: string;
  supplier_category_kind?: string;
  supplier_department_kind?: string;
  contact_name?: string;
  contact_title?: string;
  weekly_inventory_day?: string;
  is_also_customer?: boolean;
  linked_customer?: string | null;
  linked_customer_code?: string;
  linked_customer_name?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
};

export async function fetchSuppliers(filters?: SupplierListFilters): Promise<SupplierDto[]> {
  const params = new URLSearchParams();
  if (filters?.entity_kind) params.set('entity_kind', filters.entity_kind);
  if (filters?.settlement_mode) params.set('settlement_mode', filters.settlement_mode);
  if (filters?.supplier_type) params.set('supplier_type', filters.supplier_type);
  if (filters?.supplier_group) params.set('supplier_group', filters.supplier_group);
  const q = params.toString();
  return apiFetch(`/inventory/suppliers${q ? `?${q}` : ''}`);
}

export async function createSupplier(payload: Record<string, unknown>) {
  return apiFetch('/inventory/suppliers/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSupplier(id: string, payload: Record<string, unknown>) {
  return apiFetch(`/inventory/suppliers/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteSupplier(id: string): Promise<void> {
  await apiFetch<void>(`/inventory/suppliers/${id}/`, { method: 'DELETE' });
}

export async function syncProductVariants(
  productId: string,
  sizeIds: string[],
  colorIds: string[],
): Promise<ProductDto> {
  return apiFetch<ProductDto>(`/inventory/products/${productId}/variants/`, {
    method: 'POST',
    body: JSON.stringify({ size_ids: sizeIds, color_ids: colorIds }),
  });
}

export async function fetchStockTransferOptions(): Promise<StockTransferOptions> {
  return apiFetch<StockTransferOptions>('/inventory/stock-transfers/options/');
}

export async function fetchStockTransfers(): Promise<StockTransferDto[]> {
  return apiFetch<StockTransferDto[]>('/inventory/stock-transfers/');
}

export async function createStockTransfer(payload: Record<string, unknown>): Promise<StockTransferDto> {
  return apiFetch<StockTransferDto>('/inventory/stock-transfers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitStockTransfer(id: string): Promise<StockTransferDto> {
  return apiFetch<StockTransferDto>(`/inventory/stock-transfers/${id}/submit/`, { method: 'POST' });
}

export async function approveStockTransfer(id: string): Promise<StockTransferDto> {
  return apiFetch<StockTransferDto>(`/inventory/stock-transfers/${id}/approve/`, { method: 'POST' });
}

export async function fetchStockScrap(): Promise<StockScrapDto[]> {
  return apiFetch<StockScrapDto[]>('/inventory/stock-scrap/');
}

export async function createStockScrap(payload: Record<string, unknown>): Promise<StockScrapDto> {
  return apiFetch<StockScrapDto>('/inventory/stock-scrap/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function approveStockScrap(id: string): Promise<StockScrapDto> {
  return apiFetch<StockScrapDto>(`/inventory/stock-scrap/${id}/approve/`, { method: 'POST' });
}

export type StockVoucherLineDto = {
  id?: string;
  variant: string;
  quantity: string;
  product_code?: string;
  product_name?: string;
  size_name?: string;
  color_name?: string;
};

export type StockVoucherOptions = {
  warehouses: Array<{ id: string; code: string; name_ar: string }>;
  purposes: Array<{ key: string; label_ar: string }>;
};

export type StockDisbursementDto = {
  id: string;
  code: string;
  warehouse: string;
  warehouse_name: string;
  purpose: string;
  purpose_label: string;
  notes: string;
  status: string;
  lines: StockVoucherLineDto[];
  created_at: string;
  approved_at?: string | null;
};

export type StockAdditionDto = {
  id: string;
  code: string;
  warehouse: string;
  warehouse_name: string;
  purpose: string;
  purpose_label: string;
  notes: string;
  status: string;
  lines: StockVoucherLineDto[];
  created_at: string;
  approved_at?: string | null;
};

export async function fetchStockDisbursementOptions(): Promise<StockVoucherOptions> {
  return apiFetch<StockVoucherOptions>('/inventory/stock-disbursements/options/');
}

export async function fetchStockDisbursements(): Promise<StockDisbursementDto[]> {
  return apiFetch<StockDisbursementDto[]>('/inventory/stock-disbursements/');
}

export async function createStockDisbursement(
  payload: Record<string, unknown>,
): Promise<StockDisbursementDto> {
  return apiFetch<StockDisbursementDto>('/inventory/stock-disbursements/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function approveStockDisbursement(id: string): Promise<StockDisbursementDto> {
  return apiFetch<StockDisbursementDto>(`/inventory/stock-disbursements/${id}/approve/`, {
    method: 'POST',
  });
}

export async function fetchStockAdditionOptions(): Promise<StockVoucherOptions> {
  return apiFetch<StockVoucherOptions>('/inventory/stock-additions/options/');
}

export async function fetchStockAdditions(): Promise<StockAdditionDto[]> {
  return apiFetch<StockAdditionDto[]>('/inventory/stock-additions/');
}

export async function createStockAddition(
  payload: Record<string, unknown>,
): Promise<StockAdditionDto> {
  return apiFetch<StockAdditionDto>('/inventory/stock-additions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function approveStockAddition(id: string): Promise<StockAdditionDto> {
  return apiFetch<StockAdditionDto>(`/inventory/stock-additions/${id}/approve/`, {
    method: 'POST',
  });
}

export type StockValuationRow = {
  balance_id?: string;
  product_id?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  product_code: string;
  product_name: string;
  size_name?: string;
  color_name?: string;
  quantity: string;
  purchase_price: string;
  sale_price: string;
  offer_price: string;
  purchase_value: string;
  sale_value: string;
  offer_value: string;
};

export type StockValuationReport = {
  rows: StockValuationRow[];
  totals: {
    quantity: string;
    purchase_value: string;
    sale_value: string;
    offer_value: string;
  };
};

export async function fetchStockValuation(params: {
  warehouse?: string;
  season?: string;
  merge?: boolean;
}): Promise<StockValuationReport> {
  const sp = new URLSearchParams();
  if (params.warehouse) sp.set('warehouse', params.warehouse);
  if (params.season) sp.set('season', params.season);
  if (params.merge) sp.set('merge', '1');
  const qs = sp.toString();
  return apiFetch<StockValuationReport>(
    qs ? `/inventory/stock-valuation/?${qs}` : '/inventory/stock-valuation/',
  );
}

export type StockCountLineDto = {
  id: string;
  variant: string;
  product_code: string;
  product_name: string;
  section_name: string;
  size_name: string;
  color_name: string;
  sale_price: string;
  system_qty: string;
  counted_qty: string;
  variance: string;
  variance_value: string;
  count_value: string;
};

export type StockCountDto = {
  id: string;
  code: string;
  branch: string | null;
  branch_name?: string;
  warehouse: string;
  warehouse_name: string;
  count_mode: 'filter' | 'order';
  count_mode_label?: string;
  scan_order: string | null;
  scan_order_code?: string;
  supplier: string | null;
  supplier_name?: string;
  supplier_group: string | null;
  supplier_group_name?: string;
  section: string | null;
  section_name?: string;
  brand: string | null;
  brand_name?: string;
  classification: string | null;
  classification_name?: string;
  product: string | null;
  product_name_filter?: string;
  notes: string;
  status: string;
  addition_voucher: string | null;
  addition_code?: string;
  disbursement_voucher: string | null;
  disbursement_code?: string;
  line_count?: number;
  total_variance_value?: string;
  lines: StockCountLineDto[];
  created_at: string;
  approved_at: string | null;
};

export async function fetchStockCount(id: string): Promise<StockCountDto> {
  return apiFetch<StockCountDto>(`/inventory/stock-count/${id}/`);
}

export async function fetchStockCounts(): Promise<StockCountDto[]> {
  return apiFetch<StockCountDto[]>('/inventory/stock-count/');
}

export async function createStockCount(payload: Record<string, unknown>): Promise<StockCountDto> {
  return apiFetch<StockCountDto>('/inventory/stock-count/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStockCount(
  id: string,
  payload: Record<string, unknown>,
): Promise<StockCountDto> {
  return apiFetch<StockCountDto>(`/inventory/stock-count/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function approveStockCount(id: string): Promise<StockCountDto> {
  return apiFetch<StockCountDto>(`/inventory/stock-count/${id}/approve/`, { method: 'POST' });
}

export async function undoStockCount(id: string): Promise<StockCountDto> {
  return apiFetch<StockCountDto>(`/inventory/stock-count/${id}/undo/`, { method: 'POST', body: '{}' });
}

export async function cancelStockCount(id: string): Promise<StockCountDto> {
  return apiFetch<StockCountDto>(`/inventory/stock-count/${id}/cancel/`, { method: 'POST', body: '{}' });
}

export async function deleteStockCount(id: string): Promise<void> {
  await apiFetch<void>(`/inventory/stock-count/${id}/`, { method: 'DELETE' });
}

export async function loadOrderIntoStockCount(
  id: string,
  code: string,
): Promise<StockCountDto> {
  return apiFetch<StockCountDto>(`/inventory/stock-count/${id}/load-order/`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export type SupplierGroupInventoryRow = {
  variant_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  supplier_id: string | null;
  supplier_name: string;
  size_name: string;
  color_name: string;
  purchased_qty: string;
  purchased_cost: string;
  sold_qty: string;
  sold_amount: string;
  stock_qty: string;
  expected_stock: string;
  diff_qty: string;
  return_qty: string;
  stock_value: string;
};

export type SupplierGroupInventoryReport = {
  supplier_group_id: string;
  supplier_group_name: string;
  warehouse_id: string;
  season_id: string | null;
  rows: SupplierGroupInventoryRow[];
  totals: {
    purchased_qty: string;
    purchased_cost: string;
    sold_qty: string;
    sold_amount: string;
    stock_qty: string;
    expected_stock: string;
    diff_qty: string;
    return_qty: string;
    stock_value: string;
  };
};

export async function fetchSupplierGroupInventoryReport(params: {
  supplier_group: string;
  warehouse: string;
  season?: string;
}): Promise<SupplierGroupInventoryReport> {
  const sp = new URLSearchParams();
  sp.set('supplier_group', params.supplier_group);
  sp.set('warehouse', params.warehouse);
  if (params.season) sp.set('season', params.season);
  return apiFetch<SupplierGroupInventoryReport>(
    `/inventory/reports/supplier-group/?${sp.toString()}`,
  );
}

export type CompositeProductDto = {
  id: string;
  code: string;
  barcode: string;
  name_ar: string;
  name_en: string;
  sale_price: string;
  offer_price: string | null;
  is_active: boolean;
  lines: Array<{
    id: string;
    variant: string;
    quantity: string;
    product_code: string;
    product_name: string;
    size_name: string;
    color_name: string;
  }>;
};

export async function fetchCompositeProducts(): Promise<CompositeProductDto[]> {
  return apiFetch<CompositeProductDto[]>('/inventory/composite-products/');
}

export async function createCompositeProduct(
  payload: Record<string, unknown>,
): Promise<CompositeProductDto> {
  return apiFetch<CompositeProductDto>('/inventory/composite-products/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCompositeProduct(
  id: string,
  payload: Record<string, unknown>,
): Promise<CompositeProductDto> {
  return apiFetch<CompositeProductDto>(`/inventory/composite-products/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCompositeProduct(id: string): Promise<void> {
  await apiFetch<void>(`/inventory/composite-products/${id}/`, { method: 'DELETE' });
}

export type PriceAdjustmentDto = {
  id: string;
  code: string;
  scope: string;
  target: string;
  mode: string;
  direction: string;
  value: string;
  supplier_name?: string;
  season_name?: string;
  products_affected: number;
  supplier_account_amount: string | null;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
  created_at: string;
};

export async function fetchPriceAdjustments(): Promise<PriceAdjustmentDto[]> {
  return apiFetch<PriceAdjustmentDto[]>('/inventory/price-adjustments/');
}

export async function applyPriceAdjustment(
  payload: Record<string, unknown>,
): Promise<PriceAdjustmentDto> {
  return apiFetch<PriceAdjustmentDto>('/inventory/price-adjustments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type PriceAdjustmentPreviewRow = {
  product_id: string;
  code: string;
  name_ar: string;
  supplier_name: string;
  current_price: string;
  new_price: string;
  stock_qty?: string;
  account_delta?: string;
};

export async function previewPriceAdjustment(
  payload: Record<string, unknown>,
): Promise<{
  count: number;
  rows: PriceAdjustmentPreviewRow[];
  supplier_account_delta?: string;
}> {
  return apiFetch('/inventory/price-adjustments/preview/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type OkazionNoticeRow = {
  product_id: string;
  code: string;
  barcode: string;
  name_ar: string;
  brand_name: string;
  section_name: string;
  classification_name: string;
  supplier_name: string;
  stock_qty: string;
  qty?: string;
  old_purchase_price: string;
  old_sale_price: string;
  mode: 'percent' | 'amount';
  value: string;
  enabled: boolean;
  excluded?: boolean;
  has_discount: boolean;
  new_purchase_price: string;
  markup_percent: string;
  new_offer_price?: string;
  new_sale_price: string;
  offer_discount_per_unit?: string;
  total_discount_value: string;
  account_delta: string;
};

export type OkazionNoticeListItem = {
  id: string;
  code: string;
  season_id: string;
  season_name: string;
  supplier_id: string;
  supplier_name: string;
  notice_date: string;
  user_name: string;
  total_value: string;
  products_affected: number;
};

export async function previewOkazionNotice(payload: Record<string, unknown>): Promise<{
  count: number;
  total_discount_value: string;
  supplier_account_delta: string;
  rows: OkazionNoticeRow[];
}> {
  return apiFetch('/inventory/okazion-notice/preview/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function applyOkazionNotice(payload: Record<string, unknown>): Promise<{
  id: string;
  code: string;
  products_affected: number;
  supplier_account_amount: string;
  total_discount_value: string;
  default_branch_id?: string | null;
  rows: OkazionNoticeRow[];
}> {
  return apiFetch('/inventory/okazion-notice/apply/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchOkazionNotices(limit = 200): Promise<OkazionNoticeListItem[]> {
  return apiFetch(`/inventory/okazion-notices/?limit=${limit}`);
}

export async function fetchOkazionNotice(id: string): Promise<{
  id: string;
  code: string;
  season_name: string;
  supplier_name: string;
  notice_date: string;
  user_name: string;
  total_value: string;
  lines: OkazionNoticeRow[];
}> {
  return apiFetch(`/inventory/okazion-notices/${id}/`);
}

export type StoreOfferNoticeRow = {
  product_id: string;
  code: string;
  barcode: string;
  name_ar: string;
  brand_name: string;
  section_name: string;
  classification_name: string;
  supplier_name: string;
  stock_qty: string;
  qty?: string;
  old_sale_price: string;
  mode: 'percent' | 'amount';
  value: string;
  enabled: boolean;
  excluded?: boolean;
  has_discount: boolean;
  new_offer_price: string;
  new_sale_price: string;
  total_discount_value: string;
};

export type StoreOfferNoticeListItem = {
  id: string;
  code: string;
  season_id: string;
  season_name: string;
  supplier_id: string;
  supplier_name: string;
  notice_date: string;
  user_name: string;
  total_value: string;
  products_affected: number;
  offer_starts_at?: string | null;
  offer_ends_at?: string | null;
};

export async function previewStoreOfferNotice(payload: Record<string, unknown>): Promise<{
  count: number;
  total_discount_value: string;
  rows: StoreOfferNoticeRow[];
}> {
  return apiFetch('/inventory/store-offer-notice/preview/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function applyStoreOfferNotice(payload: Record<string, unknown>): Promise<{
  id: string;
  code: string;
  products_affected: number;
  total_discount_value: string;
  default_branch_id?: string | null;
  rows: StoreOfferNoticeRow[];
}> {
  return apiFetch('/inventory/store-offer-notice/apply/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchStoreOfferNotices(limit = 200): Promise<StoreOfferNoticeListItem[]> {
  return apiFetch(`/inventory/store-offer-notices/?limit=${limit}`);
}

export type BarcodeLabelDto = {
  variant_id: string;
  product_code: string;
  product_name: string;
  size_name: string;
  color_name: string;
  barcode: string;
  sale_price: string;
  offer_price?: string;
  quantity: string;
  branch_name?: string;
  brand_name?: string;
  supplier_name?: string;
  section_name?: string;
  scale_barcode?: string;
  label_kind?: string;
};

export async function fetchBarcodeLabels(params: {
  warehouse?: string;
  q?: string;
  product?: string;
  purchase_invoice?: string;
  price_adjustment?: string;
  okazion_notice?: string;
  store_offer_notice?: string;
  branch?: string;
}): Promise<BarcodeLabelDto[]> {
  const sp = new URLSearchParams();
  if (params.warehouse) sp.set('warehouse', params.warehouse);
  if (params.q) sp.set('q', params.q);
  if (params.product) sp.set('product', params.product);
  if (params.purchase_invoice) sp.set('purchase_invoice', params.purchase_invoice);
  if (params.price_adjustment) sp.set('price_adjustment', params.price_adjustment);
  if (params.okazion_notice) sp.set('okazion_notice', params.okazion_notice);
  if (params.store_offer_notice) sp.set('store_offer_notice', params.store_offer_notice);
  if (params.branch) sp.set('branch', params.branch);
  const qs = sp.toString();
  return apiFetch<BarcodeLabelDto[]>(
    qs ? `/inventory/barcode-labels/?${qs}` : '/inventory/barcode-labels/',
  );
}

export type SupplierAccountEntryDto = {
  id: string;
  code: string;
  supplier: string;
  supplier_name: string;
  entry_type: 'debit' | 'credit';
  amount: string;
  signed_amount: string;
  source_type: 'sale' | 'price_adjustment' | '';
  source_code: string;
  sale_id: string | null;
  price_adjustment_id: string | null;
  notes: string;
  created_at: string;
};

export type SupplierAccountLedger = {
  rows: SupplierAccountEntryDto[];
  count: number;
  summary: {
    debit_total: string;
    credit_total: string;
    balance: string;
  };
};

export type CounterpartyStatementRow = {
  id: string;
  date: string;
  description: string;
  debit: string;
  credit: string;
  role: 'supplier' | 'customer';
  source_type: string;
  source_code: string;
  branch_name?: string;
  created_at: string;
};

export type CounterpartyStatement = {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  is_also_customer: boolean;
  linked_customer: { id: string; code: string; name_ar: string } | null;
  rows: CounterpartyStatementRow[];
  count: number;
  summary: {
    debit_total: string;
    credit_total: string;
    net_balance: string;
    net_label: string;
  };
};

export async function fetchSupplierAccountLedger(params: {
  supplier?: string;
  from?: string;
  to?: string;
  unified?: boolean;
}): Promise<SupplierAccountLedger | CounterpartyStatement> {
  const sp = new URLSearchParams();
  if (params.supplier) sp.set('supplier', params.supplier);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.unified) sp.set('unified', '1');
  const qs = sp.toString();
  return apiFetch(
    qs ? `/inventory/supplier-accounts/?${qs}` : '/inventory/supplier-accounts/',
  );
}

export type SupplierStatementRow = {
  id: string;
  date: string;
  document_code: string;
  season_id: string;
  season_name: string;
  transaction_type: string;
  transaction_label: string;
  purchases_total: string;
  purchases_discount: string;
  purchases_net: string;
  returns_total: string;
  returns_discount: string;
  returns_net: string;
  okazion_discount: string;
  payment_cash: string;
  payment_papers: string;
  debit: string;
  credit: string;
  balance: string;
  notes: string;
  source_type: string;
  source_id: string;
  navigate_tab: string;
};

export type SupplierAccountStatement = {
  view: 'detailed' | 'general';
  supplier: { id: string; code: string; name_ar: string };
  season_id: string;
  season_name: string;
  rows: SupplierStatementRow[];
  count: number;
  summary: {
    columns: Record<string, string>;
    net_purchases: string;
    net_after_returns_discount: string;
    net_payments: string;
    closing_balance: string;
    closing_debit: string;
    closing_credit: string;
    balance_label: string;
    actual_supplier_sales: string;
  };
};

export async function fetchSupplierAccountStatement(params: {
  supplier: string;
  season?: string;
  from?: string;
  to?: string;
  view?: 'detailed' | 'general';
}): Promise<SupplierAccountStatement> {
  const sp = new URLSearchParams({ statement: '1' });
  sp.set('supplier', params.supplier);
  if (params.season) sp.set('season', params.season);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.view) sp.set('view', params.view);
  return apiFetch(`/inventory/supplier-accounts/?${sp.toString()}`);
}
