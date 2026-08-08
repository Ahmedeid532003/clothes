import type { PosCustomerReviewRow, PosProductHit, PosSellerDto, SaleDto } from '@/lib/api/pos';
import type { CustomerReservationDto, DraftSalesLineDto, SalesQuotationDto } from '@/lib/api/sales';
import type { ScanOrderDto } from '@/lib/api/scanOrders';
import type { HeldCartRow } from '@/components/pos/posCustomerDocs';
import type { CartItem, Customer, PosLoadDocument, Product, Transaction } from './types';

function placeholderImage(code: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(code)}&background=eff6ff&color=2563eb&size=160&font-size=0.4`;
}

function normalizePayment(method: string): Transaction['paymentMethod'] {
  const m = method.toLowerCase();
  if (m.includes('card') || m.includes('visa') || m.includes('كارت')) return 'card';
  if (m.includes('wallet') || m.includes('فودافون') || m.includes('كاش')) return 'wallet';
  return 'cash';
}

function formatDocDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return `اليوم، ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  }
  return d.toLocaleDateString('ar-EG');
}

export function findProductForLoad(
  products: Product[],
  productId: string,
  label?: string,
): Product | undefined {
  return products.find(
    (p) =>
      p.id === productId ||
      p.variantId === productId ||
      p.code === productId ||
      (label && p.name === label),
  );
}

function draftLinesToItems(lines: DraftSalesLineDto[]) {
  return (lines || []).map((ln) => ({
    productId: ln.variant || ln.product_code,
    qty: Math.max(1, parseFloat(ln.quantity) || 1),
  }));
}

export function scanOrderToLoadDoc(order: ScanOrderDto): PosLoadDocument {
  return {
    id: order.code,
    customerName: order.employee_name || '—',
    date: formatDocDate(order.created_at),
    items: (order.lines || []).map((ln) => ({
      productId: ln.variant_id,
      qty: Math.max(1, parseFloat(ln.quantity) || 1),
    })),
    total: parseFloat(order.total_sale_amount) || 0,
    notes: order.notes || undefined,
  };
}

export function heldCartToLoadDoc(held: HeldCartRow): PosLoadDocument {
  return {
    id: held.label.slice(0, 24) || held.id,
    customerName: held.customerName || '—',
    date: 'سلة معلّقة',
    items: held.lines.map((ln) => ({
      productId: ln.variant || ln.product_code || ln.key,
      qty: Math.max(1, parseFloat(String(ln.quantity)) || 1),
    })),
    total: held.lines.reduce((s, ln) => {
      const q = parseFloat(String(ln.quantity)) || 0;
      const p = parseFloat(String(ln.unit_price)) || 0;
      const d = parseFloat(String(ln.discount_percent)) || 0;
      return s + q * p * (1 - d / 100);
    }, 0),
  };
}

export function quotationToLoadDoc(q: SalesQuotationDto): PosLoadDocument {
  return {
    id: q.code,
    customerName: q.customer_name || '—',
    date: formatDocDate(q.created_at),
    items: draftLinesToItems(q.lines || []),
    total: parseFloat(q.total) || 0,
    notes: q.notes || undefined,
  };
}

export function reservationToLoadDoc(r: CustomerReservationDto): PosLoadDocument {
  const total = parseFloat(r.total) || 0;
  const deposit = parseFloat(r.deposit_amount) || 0;
  return {
    id: r.code,
    customerName: r.customer_name,
    date: formatDocDate(r.created_at),
    items: draftLinesToItems(r.lines || []),
    total,
    deposit,
    remaining: Math.max(total - deposit, 0),
    notes: r.notes || undefined,
  };
}

export function saleLineToProduct(
  products: Product[],
  ln: NonNullable<SaleDto['lines']>[number],
): Product {
  const matched = products.find(
    (p) =>
      (ln.product_code && p.code === ln.product_code) ||
      p.name === ln.product_name ||
      (ln.size_name &&
        p.specifications?.['المقاس'] === ln.size_name &&
        ln.product_code &&
        p.code === ln.product_code),
  );
  if (matched) return matched;

  const qty = parseFloat(ln.quantity) || 1;
  const price =
    parseFloat(ln.unit_price || '0') ||
    (parseFloat(ln.line_total) || 0) / qty ||
    0;

  return {
    id: ln.id || ln.product_code || ln.product_name,
    code: ln.product_code || '—',
    barcode: '',
    name: ln.product_name,
    price,
    cost: 0,
    stock: 0,
    category: 'ملابس',
    image: placeholderImage(ln.product_code || ln.product_name),
    description: ln.product_name,
    rating: 0,
    specifications: ln.size_name
      ? { المقاس: ln.size_name, اللون: ln.color_name || '—' }
      : undefined,
  };
}

export function saleDtoToStudioTransaction(
  sale: SaleDto,
  products: Product[],
  customers: Customer[],
  type: Transaction['type'] = 'sale',
): Transaction {
  const customerCode =
    customers.find((c) => c.id === sale.customer)?.code ||
    customers.find((c) => c.name === sale.customer_name)?.code;

  const items: CartItem[] = (sale.lines || []).map((ln) => {
    const product = saleLineToProduct(products, ln);
    return {
      product,
      quantity: parseFloat(ln.quantity) || 1,
      discount: 0,
      sellerName: ln.seller_name || '—',
      itemBalance: product.stock,
    };
  });

  return {
    id: sale.code,
    date: sale.created_at,
    type,
    customerName: sale.customer_name || '—',
    customerCode,
    items,
    subtotal: parseFloat(sale.subtotal || sale.total) || 0,
    discount: parseFloat(sale.discount_amount || '0') || 0,
    total: parseFloat(sale.total) || 0,
    paymentMethod: normalizePayment(sale.payment_method || 'cash'),
    notes: sale.notes,
  };
}

export function posHitsToStudioProducts(hits: PosProductHit[]): Product[] {
  const rows: Product[] = [];

  for (const p of hits) {
    if (p.variants.length === 0) {
      const price = parseFloat(p.sale_price) || 0;
      rows.push({
        id: p.id,
        productDbId: p.id,
        code: p.code,
        barcode: p.barcode,
        name: p.name_ar,
        price,
        cost: 0,
        stock: 0,
        category: p.season_name || 'ملابس',
        image: placeholderImage(p.code),
        description: p.name_ar,
        rating: 4.5,
      });
      continue;
    }

    for (const v of p.variants) {
      const stock = parseFloat(v.branch_quantity_available ?? v.quantity_available) || 0;
      const unit = parseFloat(v.sale_price || v.unit_price || p.sale_price) || 0;
      const offer = parseFloat(v.offer_price || '0') || 0;
      const price = offer > 0 ? offer : unit;

      rows.push({
        id: v.variant_id,
        variantId: v.variant_id,
        productDbId: p.id,
        code: p.code,
        barcode: v.barcode || p.barcode,
        name:
          p.variants.length > 1
            ? `${p.name_ar} — ${v.size_name}/${v.color_name}`
            : p.name_ar,
        price,
        cost: 0,
        stock,
        category: p.season_name || 'ملابس',
        image: placeholderImage(p.code),
        description: p.name_ar,
        rating: 4.5,
        specifications: {
          المقاس: v.size_name,
          اللون: v.color_name,
        },
      });
    }
  }

  return rows;
}

export function customerRowToStudio(row: PosCustomerReviewRow): Customer {
  const restricted =
    row.workflow_status &&
    !['approved', 'active', 'completed'].includes(String(row.workflow_status).toLowerCase());

  return {
    id: row.id,
    code: row.code,
    name: row.name_ar,
    balance: parseFloat(row.balance_due) || 0,
    notes: row.notes || '',
    group: [row.customer_group_name, row.tier_label].filter(Boolean).join(' ') || '—',
    phone: row.phone || row.whatsapp || '',
    spouseName: row.spouse_name || undefined,
    guarantors: row.guarantor_summary
      ? row.guarantor_summary.split(/[,،]/).map((g) => g.trim()).filter(Boolean)
      : row.guarantor_name
        ? [row.guarantor_name]
        : undefined,
    status: restricted ? 'Restricted' : 'Active',
    installments: [],
  };
}

export function saleDtoToTransaction(
  sale: SaleDto,
  products: Product[] = [],
  customers: Customer[] = [],
  type: Transaction['type'] = 'sale',
): Transaction {
  if (products.length > 0 || (sale.lines?.length ?? 0) > 0) {
    return saleDtoToStudioTransaction(sale, products, customers, type);
  }
  return {
    id: sale.code,
    date: sale.created_at,
    type,
    customerName: sale.customer_name || '—',
    customerCode: undefined,
    items: [],
    subtotal: parseFloat(sale.subtotal || sale.total) || 0,
    discount: parseFloat(sale.discount_amount || '0') || 0,
    total: parseFloat(sale.total) || 0,
    paymentMethod: normalizePayment(sale.payment_method || 'cash'),
    notes: sale.notes,
  };
}

export type StudioSalesAgent = { id: string; name: string; code: string };

export function sellersToAgents(rows: PosSellerDto[]): StudioSalesAgent[] {
  return rows.map((s) => ({
    id: s.id,
    name: s.full_name,
    code: s.employee_code || s.username || s.id,
  }));
}
