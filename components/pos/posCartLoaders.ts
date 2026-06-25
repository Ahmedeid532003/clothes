import type { CustomerReservationDto, SalesQuotationDto } from '@/lib/api/sales';
import type { PosCartLine, PosCustomerSaleDto, PosProductHit, PosSellerDto } from '@/lib/api/pos';
import type { ScanOrderDto } from '@/lib/api/scanOrders';
import type { usePosSession } from './usePosSession';

type Session = ReturnType<typeof usePosSession>;

function sellerFromOrder(order: ScanOrderDto, employees: PosSellerDto[]) {
  if (!order.employee_id) return undefined;
  return employees.find((e) => e.id === order.employee_id);
}

/** مفتاح دمج عند تحميل مستندات العميل — نفس الصنف يُجمع حتى لو اختلف البائع أو مصدر التحميل */
function docMergeKey(line: PosCartLine): string {
  if (line.kind === 'variant' && line.variant) return `v:${line.variant}`;
  if (line.kind === 'composite' && line.composite) return `c:${line.composite}`;
  return line.key.replace(/#[^#]+#\d+$/, '');
}

function mergeCartLines(target: PosCartLine[], incoming: PosCartLine[]) {
  for (const line of incoming) {
    const mk = docMergeKey(line);
    const idx = target.findIndex((t) => docMergeKey(t) === mk);
    if (idx >= 0) {
      const cur = parseFloat(target[idx].quantity) || 0;
      const add = parseFloat(line.quantity) || 0;
      target[idx] = { ...target[idx], quantity: String(cur + add) };
      continue;
    }
    target.push(line);
  }
}

function buildVariantLine(
  product: PosProductHit,
  v: PosProductHit['variants'][0],
  sellerId?: string,
  sellerName?: string,
  qty = '1',
): PosCartLine {
  const sellerKey = sellerId ? `:s${sellerId}` : '';
  const key = `v:${v.variant_id}${sellerKey}`;
  const sellerSuffix = sellerName ? ` [${sellerName}]` : '';
  const label = `${product.name_ar} — ${v.size_name}/${v.color_name}${sellerSuffix}`;
  const offerDisc = parseFloat(v.offer_discount_per_unit || '0') || 0;
  const salePrice = parseFloat(v.sale_price || v.unit_price) || 0;
  const discountPct =
    offerDisc > 0 && salePrice > 0
      ? String(((offerDisc / salePrice) * 100).toFixed(2))
      : v.discount_percent || '0';
  return {
    key,
    kind: 'variant',
    variant: v.variant_id,
    label,
    product_code: product.code,
    product_name: product.name_ar,
    size_name: v.size_name,
    color_name: v.color_name,
    quantity: qty,
    unit_price: v.unit_price,
    discount_percent: discountPct,
    discount_amount: '0',
    offer_discount_per_unit: offerDisc > 0 ? String(offerDisc) : undefined,
    available: v.quantity_available,
    seller_id: sellerId,
    seller_name: sellerName,
  };
}

export function loadScanOrderToCart(
  session: Session,
  order: ScanOrderDto,
  employees: PosSellerDto[],
  bundleLabel: string,
) {
  const seller = sellerFromOrder(order, employees);
  for (const ln of order.lines || []) {
    session.addVariant(
      {
        id: ln.product_id,
        code: ln.product_code,
        name_ar: ln.product_name,
        barcode: ln.barcode,
        sale_price: ln.unit_sale_price,
        variants: [
          {
            variant_id: ln.variant_id,
            size_name: ln.size_name,
            color_name: ln.color_name,
            barcode: ln.barcode,
            quantity_available: '999',
            unit_price: ln.unit_sale_price,
          },
        ],
      },
      {
        variant_id: ln.variant_id,
        size_name: ln.size_name,
        color_name: ln.color_name,
        barcode: ln.barcode,
        quantity_available: '999',
        unit_price: ln.unit_sale_price,
      },
      seller?.id,
      seller?.full_name || order.employee_name,
      ln.quantity,
    );
  }
}

function draftDocToProduct(line: {
  variant?: string | null;
  product_code: string;
  product_name: string;
  size_name: string;
  color_name: string;
  unit_price: string;
  discount_percent: string;
}): PosProductHit {
  return {
    id: line.product_code,
    code: line.product_code,
    name_ar: line.product_name,
    barcode: '',
    sale_price: line.unit_price,
    variants: [
      {
        variant_id: line.variant!,
        size_name: line.size_name,
        color_name: line.color_name,
        barcode: '',
        quantity_available: '999',
        unit_price: line.unit_price,
        discount_percent: line.discount_percent,
      },
    ],
  };
}

function draftDocLines(
  doc: SalesQuotationDto | CustomerReservationDto,
  employees: PosSellerDto[],
  employeeId?: string | null,
): PosCartLine[] {
  const seller = employeeId ? employees.find((e) => e.id === employeeId) : undefined;
  const lines: PosCartLine[] = [];
  for (const ln of doc.lines) {
    if (!ln.variant) continue;
    const product = draftDocToProduct(ln);
    const variant = product.variants[0];
    lines.push(
      buildVariantLine(product, variant, seller?.id, seller?.full_name, ln.quantity),
    );
  }
  return lines;
}

export function loadDraftDocToCart(
  session: Session,
  doc: SalesQuotationDto | CustomerReservationDto,
  employees: PosSellerDto[],
  employeeId?: string | null,
) {
  for (const line of draftDocLines(doc, employees, employeeId)) {
    session.addVariant(
      {
        id: line.product_code!,
        code: line.product_code!,
        name_ar: line.product_name!,
        barcode: '',
        sale_price: line.unit_price,
        variants: [
          {
            variant_id: line.variant!,
            size_name: line.size_name!,
            color_name: line.color_name!,
            barcode: '',
            quantity_available: line.available,
            unit_price: line.unit_price,
            discount_percent: line.discount_percent,
          },
        ],
      },
      {
        variant_id: line.variant!,
        size_name: line.size_name!,
        color_name: line.color_name!,
        barcode: '',
        quantity_available: line.available,
        unit_price: line.unit_price,
        discount_percent: line.discount_percent,
      },
      line.seller_id,
      line.seller_name,
      line.quantity,
    );
  }
}

function saleLineToProduct(line: PosCustomerSaleDto['lines'][0]): PosProductHit | null {
  if (!line.variant) return null;
  return {
    id: line.product_code,
    code: line.product_code,
    name_ar: line.product_name,
    barcode: '',
    sale_price: line.unit_price,
    variants: [
      {
        variant_id: line.variant,
        size_name: line.size_name,
        color_name: line.color_name,
        barcode: '',
        quantity_available: '999',
        unit_price: line.unit_price,
        discount_percent: line.discount_percent,
      },
    ],
  };
}

function saleLines(sale: PosCustomerSaleDto): PosCartLine[] {
  const lines: PosCartLine[] = [];
  for (const ln of sale.lines) {
    if (ln.is_composite && ln.composite_product) {
      const sellerKey = ln.seller ? `:s${ln.seller}` : '';
      lines.push({
        key: `c:${ln.composite_product}${sellerKey}`,
        kind: 'composite',
        composite: ln.composite_product,
        label: ln.seller_name ? `${ln.product_name} [${ln.seller_name}]` : ln.product_name,
        product_code: ln.product_code,
        product_name: ln.product_name,
        size_name: '',
        color_name: '',
        quantity: ln.quantity,
        unit_price: ln.unit_price,
        discount_percent: ln.discount_percent || '0',
        discount_amount: '0',
        available: '999',
        seller_id: ln.seller || undefined,
        seller_name: ln.seller_name || undefined,
      });
      continue;
    }
    const product = saleLineToProduct(ln);
    if (!product) continue;
    lines.push(
      buildVariantLine(
        product,
        product.variants[0],
        ln.seller || undefined,
        ln.seller_name || undefined,
        ln.quantity,
      ),
    );
  }
  return lines;
}

export function loadSaleToCart(session: Session, sale: PosCustomerSaleDto) {
  for (const line of saleLines(sale)) {
    if (line.kind === 'composite' && line.composite) {
      session.addComposite(
        {
          id: line.composite,
          code: line.product_code || '',
          name_ar: line.product_name || '',
          barcode: '',
          sale_price: line.unit_price,
          offer_price: null,
          unit_price: line.unit_price,
          max_sets_available: '999',
          components: [],
        },
        line.product_name || '',
        line.seller_id,
        line.seller_name,
        line.quantity,
      );
      continue;
    }
    const product = saleLineToProduct({
      variant: line.variant,
      product_code: line.product_code || '',
      product_name: line.product_name || '',
      size_name: line.size_name || '',
      color_name: line.color_name || '',
      unit_price: line.unit_price,
      discount_percent: line.discount_percent,
      quantity: line.quantity,
      is_composite: false,
      composite_product: null,
      seller: line.seller_id,
      seller_name: line.seller_name,
    } as PosCustomerSaleDto['lines'][0]);
    if (!product) continue;
    session.addVariant(
      product,
      product.variants[0],
      line.seller_id,
      line.seller_name,
      line.quantity,
    );
  }
}

export type CustomerDocsPayload = {
  reservations: CustomerReservationDto[];
  quotations: SalesQuotationDto[];
  sales: PosCustomerSaleDto[];
};

/**
 * يدمج مستندات العميل المفتوحة فقط (حجوزات، عروض أسعار، سلال معلّقة).
 * لا يُحمّل فواتير البيع المكتملة تلقائياً — تحميلها مع السلة المعلّقة كان يضاعف الإجمالي.
 */
export function loadAllCustomerDocumentsToCart(
  session: Session,
  data: CustomerDocsPayload,
  held: import('./posCustomerDocs').HeldCartRow[],
  employees: PosSellerDto[],
): { docCount: number; lineCount: number; invoiceDiscount: string; deliveryFees: string } {
  const merged: PosCartLine[] = [];
  let docCount = 0;
  let invDisc = 0;
  let delivery = 0;
  let lineCount = 0;

  for (const r of data.reservations) {
    if (!r.lines?.length || r.status === 'converted') continue;
    mergeCartLines(merged, draftDocLines(r, employees));
    invDisc += parseFloat(r.discount_amount || '0') || 0;
    lineCount += r.lines.length;
    docCount += 1;
  }

  for (const q of data.quotations) {
    if (!q.lines?.length || q.status === 'converted') continue;
    mergeCartLines(merged, draftDocLines(q, employees));
    invDisc += parseFloat(q.discount_amount || '0') || 0;
    lineCount += q.lines.length;
    docCount += 1;
  }

  for (const h of held) {
    if (!h.lines?.length) continue;
    mergeCartLines(merged, h.lines);
    invDisc += parseFloat(h.invoiceDiscount || '0') || 0;
    delivery += parseFloat(h.deliveryFees || '0') || 0;
    lineCount += h.lines.length;
    docCount += 1;
  }

  if (docCount > 0) {
    session.setCart(merged);
  }

  return {
    docCount,
    lineCount,
    invoiceDiscount: String(invDisc),
    deliveryFees: String(delivery),
  };
}
