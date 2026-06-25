import React, { useCallback, useEffect, useState } from 'react';
import { Printer, Search } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  fetchBarcodeLabels,
  fetchPriceAdjustments,
  fetchProducts,
  fetchWarehouses,
  type BarcodeLabelDto,
  type PriceAdjustmentDto,
  type ProductDto,
  type WarehouseDto,
} from '@/lib/api/inventory';
import { fetchPurchaseInvoices, type PurchaseInvoiceDto } from '@/lib/api/purchases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SourceType = 'search' | 'product' | 'invoice' | 'adjustment';

export function BarcodePrintPage() {
  const { t } = useLanguage();
  const { activeBranchId, branches } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoiceDto[]>([]);
  const [adjustments, setAdjustments] = useState<PriceAdjustmentDto[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [source, setSource] = useState<SourceType>('search');
  const [productId, setProductId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [adjustmentId, setAdjustmentId] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [labels, setLabels] = useState<BarcodeLabelDto[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<'thermal' | 'a4'>('thermal');
  const [loading, setLoading] = useState(false);

  const branchWarehouse = warehouses.find((w) => w.primary_branch === activeBranchId);

  const loadMeta = useCallback(async () => {
    const [wh, prods, inv, adj] = await Promise.all([
      fetchWarehouses(),
      fetchProducts(),
      fetchPurchaseInvoices('purchase'),
      fetchPriceAdjustments(),
    ]);
    setWarehouses(wh);
    setProducts(prods);
    setInvoices(inv.filter((i) => i.status === 'received'));
    setAdjustments(adj);
    const preferred = wh.find((w) => w.primary_branch === activeBranchId) ?? wh[0];
    if (preferred) setWarehouseId(preferred.id);
  }, [activeBranchId]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const runSearch = async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof fetchBarcodeLabels>[0] = {
        warehouse: warehouseId || undefined,
      };
      if (source === 'search') {
        params.q = searchQ || undefined;
      } else if (source === 'product') {
        params.product = productId || undefined;
      } else if (source === 'invoice') {
        params.purchase_invoice = invoiceId || undefined;
      } else if (source === 'adjustment') {
        params.price_adjustment = adjustmentId || undefined;
      }
      const data = await fetchBarcodeLabels(params);
      setLabels(data);
      const qtyMap: Record<string, string> = {};
      data.forEach((l) => {
        const q = parseFloat(l.quantity);
        qtyMap[l.variant_id] = String(q > 0 ? Math.ceil(q) : 1);
      });
      setQuantities(qtyMap);
    } finally {
      setLoading(false);
    }
  };

  const printLabels = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const items = labels
      .map((l) => ({
        ...l,
        printQty: parseInt(quantities[l.variant_id] || '1', 10) || 1,
      }))
      .flatMap((l) => Array.from({ length: l.printQty }, () => l));

    const isThermal = layout === 'thermal';
    const labelHtml = items
      .map(
        (l) => `
      <div class="${isThermal ? 'label thermal' : 'label a4'}">
        <div class="name">${l.product_name}</div>
        <div class="meta">${l.size_name} / ${l.color_name}</div>
        <div class="barcode">${l.barcode}</div>
        <div class="price">${l.offer_price && parseFloat(l.offer_price) > 0 ? l.offer_price : l.sale_price} ${t('dashboard.currency')}</div>
      </div>`,
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html><html dir="rtl"><head><title>${t('nav.barcodePrint')}</title>
      <style>
        body { font-family: Cairo, Tahoma, sans-serif; margin: 8px; }
        .sheet { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start; }
        .label.thermal { width: 50mm; min-height: 30mm; border: 1px dashed #ccc; padding: 6px; text-align: center; page-break-inside: avoid; }
        .label.a4 { width: 48mm; height: 28mm; border: 1px solid #ddd; padding: 6px; text-align: center; page-break-inside: avoid; }
        .name { font-weight: bold; font-size: 10px; line-height: 1.2; }
        .meta { font-size: 8px; color: #555; }
        .barcode { font-family: monospace; font-size: 13px; margin: 4px 0; letter-spacing: 1px; }
        .price { font-size: 11px; font-weight: bold; }
        @media print { .no-print { display: none; } body { margin: 0; } }
      </style></head><body>
      <button class="no-print" onclick="window.print()">${t('inventory.print')}</button>
      <div class="sheet">${labelHtml}</div>
      </body></html>`);
    printWindow.document.close();
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  return (
    <div className="space-y-4 p-1">
      <h1 className="text-xl font-bold">{t('nav.barcodePrint')}</h1>
      {activeBranch && (
        <p className="text-sm text-slate-600">
          {t('inventory.branchStock')}: {activeBranch.name_ar}
          {branchWarehouse ? ` — ${branchWarehouse.name_ar}` : ''}
        </p>
      )}

      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value as SourceType)}
          >
            <option value="search">{t('inventory.sourceSearch')}</option>
            <option value="product">{t('inventory.sourceProduct')}</option>
            <option value="invoice">{t('inventory.sourceInvoice')}</option>
            <option value="adjustment">{t('inventory.sourceAdjustment')}</option>
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm min-w-[140px]"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">{t('inventory.allWarehouses')}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name_ar}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={layout}
            onChange={(e) => setLayout(e.target.value as 'thermal' | 'a4')}
          >
            <option value="thermal">{t('inventory.layoutThermal')}</option>
            <option value="a4">{t('inventory.layoutA4')}</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {source === 'search' && (
            <Input
              className="max-w-md flex-1 min-w-[200px]"
              placeholder={t('inventory.searchBarcode')}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          )}
          {source === 'product' && (
            <select
              className="rounded-md border px-3 py-2 text-sm flex-1 min-w-[200px]"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">{t('inventory.allProducts')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name_ar}
                </option>
              ))}
            </select>
          )}
          {source === 'invoice' && (
            <select
              className="rounded-md border px-3 py-2 text-sm flex-1 min-w-[200px]"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            >
              <option value="">{t('inventory.selectInvoice')}</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.code} — {inv.supplier_name} ({inv.invoice_date})
                </option>
              ))}
            </select>
          )}
          {source === 'adjustment' && (
            <select
              className="rounded-md border px-3 py-2 text-sm flex-1 min-w-[200px]"
              value={adjustmentId}
              onChange={(e) => setAdjustmentId(e.target.value)}
            >
              <option value="">{t('inventory.selectAdjustment')}</option>
              {adjustments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.scope} / {a.target} ({a.products_affected})
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" onClick={runSearch} disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
          <Button onClick={printLabels} disabled={labels.length === 0}>
            <Printer className="h-4 w-4 me-1" />
            {t('inventory.print')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-start">{t('inventory.product')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.barcode')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.salePrice')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.printStockQty')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.printQty')}</th>
            </tr>
          </thead>
          <tbody>
            {labels.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.searchToPrint')}
                </td>
              </tr>
            ) : (
              labels.map((l) => (
                <tr key={l.variant_id} className="border-t">
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs text-slate-500">{l.product_code}</span>
                    <br />
                    {l.product_name} — {l.size_name}/{l.color_name}
                  </td>
                  <td className="px-4 py-2 font-mono">{l.barcode}</td>
                  <td className="px-4 py-2 text-end">
                    {l.offer_price && parseFloat(l.offer_price) > 0 ? l.offer_price : l.sale_price}
                  </td>
                  <td className="px-4 py-2 text-end text-slate-500">{l.quantity}</td>
                  <td className="px-4 py-2 text-end">
                    <Input
                      className="h-8 w-16 ms-auto text-end"
                      value={quantities[l.variant_id] ?? '1'}
                      onChange={(e) =>
                        setQuantities({ ...quantities, [l.variant_id]: e.target.value })
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
