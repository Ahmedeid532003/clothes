/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Season {
  code: string;
  name: string;
  isOpen: boolean;
  isCurrent: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Department {
  code: string;
  name: string;
}

export interface Brand {
  code: string;
  name: string;
}

export interface Classification {
  code: string;
  name: string;
}

export interface Size {
  code: string;
  name: string;
}

export interface Color {
  code: string;
  name: string;
  hex: string;
}

export interface Warehouse {
  code: string;
  name: string;
  branch: string;
  branchId?: string;
  manager: string;
  isDefaultSalePoint: boolean;
  description?: string;
}

export interface ProductVariant {
  sizeCode: string;
  colorCode: string;
  barcode: string;
  sku: string;
}

export interface Product {
  code: string;
  name: string;
  description?: string;
  barcode: string; // fallback if single variant
  buyPrice: number;
  sellPrice: number;
  brandCode: string;
  classificationCode: string;
  departmentCode: string;
  seasonCode: string;
  isComposite: boolean;
  composition?: Array<{
    productCode: string;
    quantity: number;
  }>;
  variants: ProductVariant[];
  imageColor?: string; // Tailwind bg color placeholder for the apparel icon
}

export interface InventoryBalance {
  id: string;
  /** معرّف المتغير (مقاس/لون) من الـ API */
  variantId?: string;
  warehouseCode: string;
  productCode: string;
  sizeCode: string;
  colorCode: string;
  quantity: number;
}

export interface PermitItem {
  productCode: string;
  sizeCode: string;
  colorCode: string;
  quantity: number;
  /** معرّف المتغير على السيرفر عند توفره */
  variantId?: string;
}

export interface MovementPermit {
  /** معرّف السجل على السيرفر (للموافقة والإجراءات) */
  id?: string;
  code: string;
  type: 'transfer' | 'disbursement' | 'addition' | 'scrap'; // تحويل | صرف | إضافة | هالك
  status: 'draft' | 'pending_approval' | 'approved'; // مسودة | بانتظار الموافقة | معتمد
  date: string;
  fromWarehouseCode?: string; // for transfer, disbursement, scrap
  toWarehouseCode?: string; // for transfer, addition
  /** مفتاح الغرض في الـ API (sale, sample, supplier_purchase, …) */
  purposeKey?: string;
  /** تسمية الغرض للعرض */
  purpose?: string;
  reason?: string; // السبب for scrap (e.g., تلف، انتهاء صلاحية)
  items: PermitItem[];
  notes?: string;
  requiresManagerApproval: boolean;
}

export interface AuditItem {
  productCode: string;
  sizeCode: string;
  colorCode: string;
  variantId?: string;
  bookQty: number; // الرصيد الدفتري
  actualQty: number; // الرصيد الفعلي
}

export interface InventoryAudit {
  code: string;
  warehouseCode: string;
  seasonCode: string;
  date: string;
  status: 'draft' | 'completed'; // مسودة | مكتملة ومسواة
  scope: string; // نطاق الجرد (e.g. "كل المخزن", "تصنيف معين")
  items: AuditItem[];
  notes?: string;
}
