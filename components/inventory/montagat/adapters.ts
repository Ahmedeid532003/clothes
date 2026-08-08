import type {
  CatalogItem,
  CompositeProductDto,
  ProductDto,
  SeasonDto,
  StockAdditionDto,
  StockBalanceDto,
  StockCountDto,
  StockDisbursementDto,
  StockScrapDto,
  StockTransferDto,
  WarehouseDto,
} from '@/lib/api/inventory';
import type {
  Brand,
  Classification,
  Color,
  Department,
  InventoryAudit,
  InventoryBalance,
  MovementPermit,
  PermitItem,
  Product,
  Season,
  Size,
  Warehouse,
} from './types';

export type ColorCatalogItem = CatalogItem & { hex_code?: string };

export type MontagatMaps = {
  brandIdByCode: Map<string, string>;
  brandCodeById: Map<string, string>;
  sectionIdByCode: Map<string, string>;
  sectionCodeById: Map<string, string>;
  classificationIdByCode: Map<string, string>;
  classificationCodeById: Map<string, string>;
  sizeIdByCode: Map<string, string>;
  sizeCodeById: Map<string, string>;
  colorIdByCode: Map<string, string>;
  colorCodeById: Map<string, string>;
  seasonIdByCode: Map<string, string>;
  seasonCodeById: Map<string, string>;
  warehouseIdByCode: Map<string, string>;
  warehouseCodeById: Map<string, string>;
  productIdByCode: Map<string, string>;
  compositeIdByCode: Map<string, string>;
  variantIdByKey: Map<string, string>;
  variantKeyById: Map<string, string>;
};

export function catalogName(item: CatalogItem) {
  return item.name_ar?.trim() || item.name_en?.trim() || item.code;
}

export function buildMontagatMaps(
  brands: CatalogItem[],
  sections: CatalogItem[],
  classifications: CatalogItem[],
  sizes: CatalogItem[],
  colors: ColorCatalogItem[],
  seasons: SeasonDto[],
  warehouses: WarehouseDto[],
  products: ProductDto[],
  composites: CompositeProductDto[],
): MontagatMaps {
  const brandIdByCode = new Map<string, string>();
  const brandCodeById = new Map<string, string>();
  brands.forEach((b) => {
    brandIdByCode.set(b.code, b.id);
    brandCodeById.set(b.id, b.code);
  });

  const sectionIdByCode = new Map<string, string>();
  const sectionCodeById = new Map<string, string>();
  sections.forEach((s) => {
    sectionIdByCode.set(s.code, s.id);
    sectionCodeById.set(s.id, s.code);
  });

  const classificationIdByCode = new Map<string, string>();
  const classificationCodeById = new Map<string, string>();
  classifications.forEach((c) => {
    classificationIdByCode.set(c.code, c.id);
    classificationCodeById.set(c.id, c.code);
  });

  const sizeIdByCode = new Map<string, string>();
  const sizeCodeById = new Map<string, string>();
  sizes.forEach((s) => {
    sizeIdByCode.set(s.code, s.id);
    sizeCodeById.set(s.id, s.code);
  });

  const colorIdByCode = new Map<string, string>();
  const colorCodeById = new Map<string, string>();
  colors.forEach((c) => {
    colorIdByCode.set(c.code, c.id);
    colorCodeById.set(c.id, c.code);
  });

  const seasonIdByCode = new Map<string, string>();
  const seasonCodeById = new Map<string, string>();
  seasons.forEach((s) => {
    seasonIdByCode.set(s.code, s.id);
    seasonCodeById.set(s.id, s.code);
  });

  const warehouseIdByCode = new Map<string, string>();
  const warehouseCodeById = new Map<string, string>();
  warehouses.forEach((w) => {
    warehouseIdByCode.set(w.code, w.id);
    warehouseCodeById.set(w.id, w.code);
  });

  const productIdByCode = new Map<string, string>();
  const compositeIdByCode = new Map<string, string>();
  const variantIdByKey = new Map<string, string>();
  const variantKeyById = new Map<string, string>();

  products.forEach((p) => {
    productIdByCode.set(p.code, p.id);
    for (const v of p.variants || []) {
      const sizeCode = sizeCodeById.get(v.size) || v.size_name || '';
      const colorCode = colorCodeById.get(v.color) || v.color_name || '';
      const key = variantKey(p.code, sizeCode, colorCode);
      variantIdByKey.set(key, v.id);
      variantKeyById.set(v.id, key);
    }
  });

  composites.forEach((c) => {
    compositeIdByCode.set(c.code, c.id);
  });

  return {
    brandIdByCode,
    brandCodeById,
    sectionIdByCode,
    sectionCodeById,
    classificationIdByCode,
    classificationCodeById,
    sizeIdByCode,
    sizeCodeById,
    colorIdByCode,
    colorCodeById,
    seasonIdByCode,
    seasonCodeById,
    warehouseIdByCode,
    warehouseCodeById,
    productIdByCode,
    compositeIdByCode,
    variantIdByKey,
    variantKeyById,
  };
}

export function variantKey(productCode: string, sizeCode: string, colorCode: string) {
  return `${productCode}|${sizeCode}|${colorCode}`;
}

export type StockCountLineInput = {
  variant: string;
  system_qty: number;
  counted_qty: number;
};

/** Map variant UUID → actual counted qty from audit modal rows. */
export function buildActualQtyByVariantFromAudit(
  audit: InventoryAudit,
  warehouseId: string,
  balanceRows: StockBalanceDto[],
  maps: MontagatMaps,
): Map<string, number> {
  const rowsForWarehouse = balanceRows.filter((b) => b.warehouse === warehouseId);
  const actualByVariant = new Map<string, number>();
  for (const item of audit.items) {
    const vid =
      item.variantId ??
      rowsForWarehouse.find(
        (b) =>
          b.product_code === item.productCode &&
          b.size_name === item.sizeCode &&
          b.color_name === item.colorCode,
      )?.variant ??
      maps.variantIdByKey.get(variantKey(item.productCode, item.sizeCode, item.colorCode));
    if (vid) actualByVariant.set(vid, item.actualQty);
  }
  return actualByVariant;
}

/** Build stock-count lines from audit UI + server balance rows (variant UUIDs). */
export function buildStockCountLinesFromAudit(
  audit: InventoryAudit,
  warehouseId: string,
  balanceRows: StockBalanceDto[],
  maps: MontagatMaps,
): StockCountLineInput[] {
  const rowsForWarehouse = balanceRows.filter((b) => b.warehouse === warehouseId);
  const actualByVariant = buildActualQtyByVariantFromAudit(audit, warehouseId, balanceRows, maps);

  if (rowsForWarehouse.length > 0) {
    return rowsForWarehouse.map((b) => ({
      variant: b.variant,
      system_qty: parseFloat(b.quantity) || 0,
      counted_qty: actualByVariant.has(b.variant)
        ? actualByVariant.get(b.variant)!
        : parseFloat(b.quantity) || 0,
    }));
  }

  const fromItems: StockCountLineInput[] = [];
  for (const item of audit.items) {
    const vid =
      item.variantId ??
      maps.variantIdByKey.get(variantKey(item.productCode, item.sizeCode, item.colorCode));
    if (!vid) continue;
    fromItems.push({
      variant: vid,
      system_qty: item.bookQty,
      counted_qty: item.actualQty,
    });
  }
  return fromItems;
}

export function seasonDtoToMontagat(s: SeasonDto): Season {
  return {
    code: s.code,
    name: s.name_ar || s.name_en || s.code,
    isOpen: s.is_open,
    isCurrent: s.is_current,
    startDate: s.starts_at || undefined,
    endDate: s.ends_at || undefined,
  };
}

export function departmentFromCatalog(s: CatalogItem): Department {
  return { code: s.code, name: catalogName(s) };
}

export function brandFromCatalog(b: CatalogItem): Brand {
  return { code: b.code, name: catalogName(b) };
}

export function classificationFromCatalog(c: CatalogItem): Classification {
  return { code: c.code, name: catalogName(c) };
}

export function sizeFromCatalog(s: CatalogItem): Size {
  return { code: s.code, name: catalogName(s) };
}

export function colorFromCatalog(c: ColorCatalogItem): Color {
  return {
    code: c.code,
    name: catalogName(c),
    hex: c.hex_code?.trim() || '#2563EB',
  };
}

export function warehouseDtoToMontagat(w: WarehouseDto): Warehouse {
  return {
    code: w.code,
    name: w.name_ar || w.name_en || w.code,
    branch: w.primary_branch_name || w.primary_branch || '—',
    manager: w.manager_name || '—',
    isDefaultSalePoint: Boolean(w.is_sale_outlet),
    description: w.name_en || undefined,
  };
}

const IMAGE_COLORS = [
  'bg-rose-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-cyan-500',
];

export function productDtoToMontagat(
  p: ProductDto,
  maps: MontagatMaps,
  colorIdx = 0,
): Product {
  return {
    code: p.code,
    name: p.name_ar || p.name_en || p.code,
    description: p.description,
    barcode: p.barcode,
    buyPrice: parseFloat(p.purchase_price) || 0,
    sellPrice: parseFloat(p.sale_price) || 0,
    brandCode: (p.brand && maps.brandCodeById.get(p.brand)) || p.brand || '',
    classificationCode:
      (p.classification && maps.classificationCodeById.get(p.classification)) ||
      p.classification ||
      '',
    departmentCode: (p.section && maps.sectionCodeById.get(p.section)) || p.section || '',
    seasonCode: (p.season && maps.seasonCodeById.get(p.season)) || p.season || '',
    isComposite: false,
    variants: (p.variants || []).map((v) => ({
      sizeCode: maps.sizeCodeById.get(v.size) || v.size_name || '',
      colorCode: maps.colorCodeById.get(v.color) || v.color_name || '',
      barcode: v.barcode || p.barcode,
      sku: `${p.code}-${v.size_name}-${v.color_name}`,
    })),
    imageColor: IMAGE_COLORS[colorIdx % IMAGE_COLORS.length],
  };
}

export function compositeDtoToMontagat(
  c: CompositeProductDto,
  maps: MontagatMaps,
  colorIdx = 0,
): Product {
  return {
    code: c.code,
    name: c.name_ar || c.name_en || c.code,
    barcode: c.barcode,
    buyPrice: 0,
    sellPrice: parseFloat(c.sale_price) || 0,
    brandCode: '',
    classificationCode: '',
    departmentCode: '',
    seasonCode: '',
    isComposite: true,
    composition: c.lines.map((ln) => ({
      productCode: ln.product_code,
      quantity: parseFloat(ln.quantity) || 1,
    })),
    variants: c.lines.length
      ? [
          {
            sizeCode: maps.sizeCodeById.get(c.lines[0].variant.split('-')[0]) || '—',
            colorCode: '—',
            barcode: c.barcode,
            sku: c.code,
          },
        ]
      : [],
    imageColor: IMAGE_COLORS[colorIdx % IMAGE_COLORS.length],
  };
}

export function balanceDtoToMontagat(b: StockBalanceDto, maps: MontagatMaps): InventoryBalance | null {
  const variantKeyStr = maps.variantKeyById.get(b.variant);
  if (!variantKeyStr) {
    const parts = b.product_code ? [b.product_code, b.size_name, b.color_name] : [];
    if (parts.length < 3) return null;
    return {
      id: b.id,
      variantId: b.variant,
      warehouseCode: b.warehouse_code,
      productCode: b.product_code,
      sizeCode: b.size_name,
      colorCode: b.color_name,
      quantity: parseFloat(b.quantity) || 0,
    };
  }
  const [productCode, sizeCode, colorCode] = variantKeyStr.split('|');
  return {
    id: b.id,
    variantId: b.variant,
    warehouseCode: b.warehouse_code,
    productCode,
    sizeCode,
    colorCode,
    quantity: parseFloat(b.quantity) || 0,
  };
}

function mapPermitStatus(status: string): MovementPermit['status'] {
  const s = status.toLowerCase();
  if (s === 'pending') return 'pending_approval';
  if (s === 'approved') return 'approved';
  if (s === 'draft') return 'draft';
  return 'draft';
}

function mapLineToPermitItem(
  line: { variant?: string; product_code?: string; quantity: string; size_name?: string; color_name?: string },
  maps: MontagatMaps,
): PermitItem | null {
  const key = line.variant ? maps.variantKeyById.get(line.variant) : null;
  if (key) {
    const [productCode, sizeCode, colorCode] = key.split('|');
    return {
      productCode,
      sizeCode,
      colorCode,
      quantity: parseFloat(line.quantity) || 0,
    };
  }
  if (line.product_code) {
    return {
      productCode: line.product_code,
      sizeCode: line.size_name || '',
      colorCode: line.color_name || '',
      quantity: parseFloat(line.quantity) || 0,
    };
  }
  return null;
}

export function transferToPermit(t: StockTransferDto, maps: MontagatMaps): MovementPermit {
  return {
    id: t.id,
    code: t.code,
    type: 'transfer',
    status: mapPermitStatus(t.status),
    date: t.created_at.slice(0, 10),
    fromWarehouseCode: maps.warehouseCodeById.get(t.from_warehouse) || t.from_warehouse_name,
    toWarehouseCode: maps.warehouseCodeById.get(t.to_warehouse) || t.to_warehouse_name,
    notes: t.notes,
    items: t.lines.map((l) => mapLineToPermitItem(l, maps)).filter(Boolean) as PermitItem[],
    requiresManagerApproval: t.requires_approval,
  };
}

export function disbursementToPermit(d: StockDisbursementDto, maps: MontagatMaps): MovementPermit {
  return {
    id: d.id,
    code: d.code,
    type: 'disbursement',
    status: mapPermitStatus(d.status),
    date: d.created_at.slice(0, 10),
    fromWarehouseCode: maps.warehouseCodeById.get(d.warehouse) || d.warehouse_name,
    purposeKey: d.purpose,
    purpose: d.purpose_label || d.purpose,
    notes: d.notes,
    items: d.lines.map((l) => mapLineToPermitItem(l, maps)).filter(Boolean) as PermitItem[],
    requiresManagerApproval: false,
  };
}

export function additionToPermit(a: StockAdditionDto, maps: MontagatMaps): MovementPermit {
  return {
    id: a.id,
    code: a.code,
    type: 'addition',
    status: mapPermitStatus(a.status),
    date: a.created_at.slice(0, 10),
    toWarehouseCode: maps.warehouseCodeById.get(a.warehouse) || a.warehouse_name,
    purposeKey: a.purpose,
    purpose: a.purpose_label || a.purpose,
    notes: a.notes,
    items: a.lines.map((l) => mapLineToPermitItem(l, maps)).filter(Boolean) as PermitItem[],
    requiresManagerApproval: false,
  };
}

export function scrapToPermit(s: StockScrapDto, maps: MontagatMaps): MovementPermit {
  return {
    id: s.id,
    code: s.code,
    type: 'scrap',
    status: mapPermitStatus(s.status),
    date: s.created_at.slice(0, 10),
    fromWarehouseCode: maps.warehouseCodeById.get(s.warehouse) || s.warehouse_name,
    reason: s.reason,
    items: s.lines.map((l) => mapLineToPermitItem(l, maps)).filter(Boolean) as PermitItem[],
    requiresManagerApproval: false,
  };
}

export function stockCountToAudit(c: StockCountDto, maps: MontagatMaps): InventoryAudit {
  const seasonCode = '';
  return {
    code: c.code,
    warehouseCode: maps.warehouseCodeById.get(c.warehouse) || c.warehouse_name,
    seasonCode,
    date: c.created_at.slice(0, 10),
    status: c.status === 'approved' ? 'completed' : 'draft',
    scope: c.section_name || c.brand_name || c.notes || 'جرد مخزن',
    notes: c.notes,
    items: c.lines.map((ln) => {
      const key = maps.variantKeyById.get(ln.variant);
      const [productCode = ln.product_code, sizeCode = ln.size_name, colorCode = ln.color_name] =
        key?.split('|') || [];
      return {
        productCode,
        sizeCode,
        colorCode,
        bookQty: parseFloat(ln.system_qty) || 0,
        actualQty: parseFloat(ln.counted_qty) || 0,
      };
    }),
  };
}
