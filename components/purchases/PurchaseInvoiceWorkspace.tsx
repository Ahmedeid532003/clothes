import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  brandsApi,
  classificationsApi,
  colorsApi,
  createSupplier,
  fetchInventorySettings,
  fetchSeasons,
  fetchSuppliers,
  fetchWarehouses,
  productSectionsApi,
  sizesApi,
  type CatalogItem,
  type SeasonDto,
  type WarehouseDto,
} from '@/lib/api/inventory';
import {
  createPurchaseInvoice,
  fetchPurchaseInvoice,
  fetchPurchaseInvoices,
  fetchPurchaseProducts,
  receivePurchaseInvoice,
  updatePurchaseInvoice,
  type PurchaseInvoiceDto,
  type PurchaseProductSearchRow,
} from '@/lib/api/purchases';
import { calcLineTotals } from './lineTotals';
import { ApiRequestError } from '@/lib/api/errors';
import {
  formatPurchaseApiError,
  linesReadyForSave,
} from '@/lib/purchases/validation';
import { SizeColorMatrix, type MatrixCell } from './SizeColorMatrix';
import { PurchaseMismatchDialog } from './invoice/PurchaseMismatchDialog';
import { PurchaseProductCreateSheet } from './invoice/PurchaseProductCreateSheet';
import { PurchaseSearchNotFoundDialog } from './invoice/PurchaseSearchNotFoundDialog';
import { productMatrixAxes, productNeedsMatrix } from './invoice/purchaseMatrixUtils';
import { hasInvoiceMatchForQuery } from './invoice/purchaseSearchUtils';
import { PurchaseInvoicePremiumView } from './invoice/PurchaseInvoicePremiumView';
import { LoadFromOrderButton } from '@/components/orders/LoadFromOrderButton';
import { scanOrdersApi, type ScanOrderDto } from '@/lib/api/scanOrders';
import type { InvoiceLineDraft } from './types';

export type PurchaseInvoiceWorkspaceProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  invoiceType: 'purchase' | 'return';
  editInvoice?: PurchaseInvoiceDto | null;
};

const RETURN_REASONS = [
  'defect',
  'wrong_size',
  'wrong_color',
  'excess_qty',
  'bad_quality',
  'other',
] as const;

function emptyLineDefaults(markup: string): Partial<InvoiceLineDraft> {
  return {
    discount_type: 'percent',
    discount_percent: '0',
    discount_amount: '0',
    tax_percent: '0',
    markup_percent: markup,
  };
}

export function PurchaseInvoiceWorkspace({
  open,
  onClose,
  onSaved,
  invoiceType,
  editInvoice = null,
}: PurchaseInvoiceWorkspaceProps) {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const isReturn = invoiceType === 'return';
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [suppliers, setSuppliers] = useState<CatalogItem[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [brands, setBrands] = useState<CatalogItem[]>([]);
  const [sections, setSections] = useState<CatalogItem[]>([]);
  const [classifications, setClassifications] = useState<CatalogItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [sizes, setSizes] = useState<CatalogItem[]>([]);
  const [colors, setColors] = useState<CatalogItem[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<PurchaseProductSearchRow[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lines, setLines] = useState<InvoiceLineDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [matrixProduct, setMatrixProduct] = useState<PurchaseProductSearchRow | null>(null);
  const [mismatchProduct, setMismatchProduct] = useState<PurchaseProductSearchRow | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showSearchNotFound, setShowSearchNotFound] = useState(false);
  const [createSearchPrefill, setCreateSearchPrefill] = useState('');
  const [defaultReorderPercent, setDefaultReorderPercent] = useState('0');
  const [sourcePurchases, setSourcePurchases] = useState<PurchaseInvoiceDto[]>([]);
  const [profitPercent, setProfitPercent] = useState('30');
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);
  const [header, setHeader] = useState({
    supplier: '',
    season: '',
    brand: '',
    section: '',
    classification: '',
    warehouse: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    notes: '',
    discount_amount: '0',
    payment_method: 'credit' as 'cash' | 'credit',
    return_reason: '' as string,
    source_invoice: '',
  });

  const loadMeta = useCallback(async () => {
    const [sup, sn, br, sec, cls, wh, sz, cl, settings] = await Promise.all([
      fetchSuppliers(),
      fetchSeasons(),
      brandsApi.list(),
      productSectionsApi.list(),
      classificationsApi.list(),
      fetchWarehouses(),
      sizesApi.list(),
      colorsApi.list(),
      fetchInventorySettings(),
    ]);
    setSuppliers(sup);
    setSeasons(sn);
    setBrands(br);
    setSections(sec);
    setClassifications(cls);
    setWarehouses(wh);
    setSizes(sz);
    setColors(cl);
    setDefaultReorderPercent(settings.default_reorder_percent || '0');
    const current = sn.find((s) => s.is_current);
    setHeader((h) => ({
      ...h,
      supplier: h.supplier || sup[0]?.id || '',
      season: h.season || current?.id || sn[0]?.id || '',
      warehouse: h.warehouse || wh[0]?.id || '',
    }));
  }, []);

  useEffect(() => {
    if (!open) return;
    loadMeta();
    if (editInvoice) {
      setHeader({
        supplier: editInvoice.supplier,
        season: editInvoice.season,
        brand: editInvoice.brand || '',
        section: '',
        classification: '',
        warehouse: editInvoice.warehouse,
        invoice_date: editInvoice.invoice_date,
        notes: editInvoice.notes,
        discount_amount: editInvoice.discount_amount,
        payment_method: editInvoice.payment_method || 'credit',
        return_reason: editInvoice.return_reason || '',
        source_invoice: editInvoice.source_invoice || '',
      });
      setLines(
        editInvoice.lines.map((ln) => ({
          key: ln.id,
          variant: ln.variant,
          label: `${ln.product_name} — ${ln.size_name}/${ln.color_name}`,
          product_code: ln.product_code,
          name_ar: ln.product_name,
          quantity: ln.quantity,
          unit_cost: ln.unit_cost,
          ...emptyLineDefaults('30'),
          discount_percent: ln.discount_percent,
          tax_percent: ln.tax_percent || '0',
        })),
      );
    } else {
      setLines([]);
      setSearchQ('');
      setHeader((h) => ({
        ...h,
        invoice_date: new Date().toISOString().slice(0, 10),
        notes: '',
        discount_amount: '0',
        payment_method: 'credit',
        return_reason: '',
        source_invoice: '',
        brand: '',
        section: '',
        classification: '',
      }));
    }
  }, [open, loadMeta, editInvoice]);

  useEffect(() => {
    if (!open || !isReturn || !header.supplier) {
      setSourcePurchases([]);
      return;
    }
    fetchPurchaseInvoices('purchase')
      .then((rows) =>
        setSourcePurchases(
          rows.filter((r) => r.status === 'received' && r.supplier === header.supplier),
        ),
      )
      .catch(() => setSourcePurchases([]));
  }, [open, isReturn, header.supplier]);

  useEffect(() => {
    if (!open || !header.supplier || !header.season) {
      setSearchResults([]);
      return;
    }
    if (!searchQ.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetchPurchaseProducts({
        supplier: header.supplier,
        season: header.season,
        brand: isReturn ? header.brand || undefined : undefined,
        section: isReturn ? header.section || undefined : undefined,
        classification: isReturn ? header.classification || undefined : undefined,
        warehouse: header.warehouse || undefined,
        q: searchQ,
        compare: !isReturn,
      })
        .then((rows) => {
          setSearchResults(rows);
          setSearchOpen(true);
        })
        .catch(() => setSearchResults([]));
    }, 280);
    return () => clearTimeout(timer);
  }, [
    open,
    header.supplier,
    header.season,
    header.brand,
    header.section,
    header.classification,
    header.warehouse,
    isReturn,
    searchQ,
  ]);

  const totals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    let lineDisc = 0;
    let qty = 0;
    for (const ln of lines) {
      const parts = calcLineTotals(ln);
      sub += parts.net;
      tax += parts.tax;
      lineDisc += parts.gross - parts.net;
      qty += parseFloat(ln.quantity) || 0;
    }
    const invDisc = parseFloat(header.discount_amount) || 0;
    return {
      sub,
      tax,
      qty,
      lineDisc,
      invDisc,
      gross: sub + tax,
      net: sub + tax - invDisc,
      itemCount: new Set(lines.map((l) => l.product || l.variant)).size,
    };
  }, [lines, header.discount_amount]);

  const updateLine = (key: string, patch: Partial<InvoiceLineDraft>) => {
    setLines((prev) =>
      prev.map((ln) => {
        if (ln.key !== key) return ln;
        const next = { ...ln, ...patch };
        if (patch.markup_percent === undefined && profitPercent) {
          next.markup_percent = profitPercent;
        }
        return next;
      }),
    );
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((ln) => ln.key !== key));
  };

  const focusQty = (key: string) => {
    requestAnimationFrame(() => {
      qtyRefs.current[key]?.focus();
      qtyRefs.current[key]?.select();
    });
  };

  const applyMatrixToLines = (
    product: PurchaseProductSearchRow,
    cells: MatrixCell[],
    unitCost: string,
  ) => {
    const newLines: InvoiceLineDraft[] = [];
    for (const cell of cells) {
      if (!cell.quantity || cell.quantity <= 0) continue;
      const variant = product.variants?.find(
        (v) => v.size === cell.sizeId && v.color === cell.colorId,
      );
      const sizeName = sizes.find((s) => s.id === cell.sizeId)?.name_ar ?? '';
      const colorName = colors.find((c) => c.id === cell.colorId)?.name_ar ?? '';
      const key = `${product.id}-${cell.sizeId}-${cell.colorId}-${Date.now()}-${Math.random()}`;
      const vExt = variant as { warehouse_qty?: string } | undefined;
      newLines.push({
        key,
        variant: variant?.id,
        product: product.id,
        size: cell.sizeId,
        color: cell.colorId,
        label: `${product.name_ar} — ${sizeName}/${colorName}`,
        product_code: product.code,
        name_ar: product.name_ar,
        description: product.description,
        brand_name: product.brand_name,
        season_name: product.season_name,
        season_id: product.season,
        quantity: String(cell.quantity),
        unit_cost: unitCost || product.purchase_price || '0',
        sale_price: product.sale_price,
        purchase_count: product.purchase_count,
        total_stock_qty: product.total_stock_qty,
        warehouse_qty: vExt?.warehouse_qty,
        ...emptyLineDefaults(profitPercent),
      });
    }
    if (newLines.length) {
      setLines((prev) => [...prev, ...newLines]);
      focusQty(newLines[0].key);
    }
    setMatrixProduct(null);
    setSearchQ('');
    setSearchOpen(false);
  };

  const trySelectProduct = (product: PurchaseProductSearchRow) => {
    if (isReturn) {
      setMatrixProduct(product);
      setSearchOpen(false);
      return;
    }
    if (!product.matches_invoice) {
      setMismatchProduct(product);
      setSearchOpen(false);
      return;
    }
    if (!productNeedsMatrix(product)) {
      const variant = product.variants?.[0];
      const key = `${product.id}-single-${Date.now()}`;
      const vExt = variant as { warehouse_qty?: string } | undefined;
      setLines((prev) => [
        ...prev,
        {
          key,
          variant: variant?.id,
          product: product.id,
          size: variant?.size,
          color: variant?.color,
          label: product.name_ar,
          product_code: product.code,
          name_ar: product.name_ar,
          description: product.description,
          brand_name: product.brand_name,
          season_name: product.season_name,
          season_id: product.season,
          quantity: '1',
          unit_cost: product.purchase_price || '0',
          sale_price: product.sale_price,
          purchase_count: product.purchase_count,
          total_stock_qty: product.total_stock_qty,
          warehouse_qty: vExt?.warehouse_qty,
          ...emptyLineDefaults(profitPercent),
        },
      ]);
      setSearchQ('');
      setSearchOpen(false);
      focusQty(key);
      return;
    }
    setMatrixProduct(product);
    setSearchOpen(false);
  };

  const buildPayload = (receive: boolean, lineRows: InvoiceLineDraft[]) => ({
    supplier: header.supplier,
    season: header.season,
    brand: header.brand || null,
    warehouse: header.warehouse,
    invoice_date: header.invoice_date,
    notes: header.notes,
    discount_amount: header.discount_amount,
    payment_method: header.payment_method,
    ...(isReturn
      ? {
          return_reason: header.return_reason,
          source_invoice: header.source_invoice || null,
        }
      : {}),
    lines: lineRows.map((l) => ({
      ...(l.variant
        ? { variant: l.variant }
        : { product: l.product, size: l.size, color: l.color }),
      quantity: String(parseFloat(l.quantity) || 0),
      unit_cost: l.unit_cost || '0',
      discount_percent:
        l.discount_type === 'percent'
          ? l.discount_percent || '0'
          : (() => {
              const gross = (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0);
              const amt = parseFloat(l.discount_amount) || 0;
              return gross > 0 ? String((amt / gross) * 100) : '0';
            })(),
      tax_percent: l.tax_percent || '0',
    })),
    receive,
  });

  const onSave = async (receive: boolean) => {
    if (isReturn && receive && !header.return_reason) {
      setError(t('purchases.returnReasonRequired'));
      return;
    }
    const readyLines = linesReadyForSave(lines);
    if (readyLines.length === 0) {
      setError(t('purchases.lineQtyRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const payload = buildPayload(receive, readyLines);
      if (editInvoice) {
        await updatePurchaseInvoice(editInvoice.id, payload);
        if (receive) await receivePurchaseInvoice(editInvoice.id);
      } else {
        await createPurchaseInvoice(invoiceType, payload);
      }
      if (loadedOrderId) {
        try {
          await scanOrdersApi.markLoaded(
            loadedOrderId,
            isReturn ? 'purchase-return' : 'purchase-invoice',
          );
        } catch {
          /* non-blocking */
        }
      }
      setLines([]);
      setLoadedOrderId(null);
      setSearchQ('');
      onSaved();
      onClose();
    } catch (e) {
      if (e instanceof Error) {
        try {
          setError(formatPurchaseApiError(JSON.parse(e.message) as unknown));
        } catch {
          setError(e.message || t('purchases.saveFailed'));
        }
      } else {
        setError(t('purchases.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const parseApiError = (e: unknown): string => {
    if (e instanceof ApiRequestError) {
      try {
        return formatPurchaseApiError(JSON.parse(e.message) as unknown);
      } catch {
        return e.message || t('purchases.saveFailed');
      }
    }
    return e instanceof Error ? e.message : t('purchases.saveFailed');
  };

  const openCreateSheet = (prefill = searchQ) => {
    setCreateSearchPrefill(prefill);
    setShowSearchNotFound(false);
    setMismatchProduct(null);
    setShowNewProduct(true);
    setSearchOpen(false);
  };

  const onProductCreated = (product: PurchaseProductSearchRow) => {
    setSearchQ('');
    setError(null);
    if (productNeedsMatrix(product)) {
      setMatrixProduct(product);
    } else {
      trySelectProduct({ ...product, matches_invoice: true, matches_supplier: true, matches_season: true });
    }
  };

  const handleSearchTab = () => {
    if (!searchQ.trim() || isReturn) return;
    if (searchResults.length === 0 || !hasInvoiceMatchForQuery(searchResults, searchQ)) {
      setShowSearchNotFound(true);
      return;
    }
    searchRef.current?.blur();
  };

  const loadFromSourceInvoice = async () => {
    if (!header.source_invoice) return;
    try {
      const inv = await fetchPurchaseInvoice(header.source_invoice);
      setHeader((h) => ({
        ...h,
        season: inv.season,
        brand: inv.brand || '',
        warehouse: inv.warehouse,
        payment_method: inv.payment_method || 'credit',
      }));
      setLines(
        inv.lines.map((ln) => ({
          key: `src-${ln.id}`,
          variant: ln.variant,
          label: `${ln.product_name} — ${ln.size_name}/${ln.color_name}`,
          product_code: ln.product_code,
          name_ar: ln.product_name,
          quantity: '0',
          unit_cost: ln.unit_cost,
          ...emptyLineDefaults(profitPercent),
          discount_percent: ln.discount_percent,
          tax_percent: ln.tax_percent || '0',
        })),
      );
      setInfo(t('purchases.enterReturnQty'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const loadFromScanOrder = (order: ScanOrderDto) => {
    if (isReturn && header.supplier && order.supplier_id && order.supplier_id !== header.supplier) {
      setError(t('scanOrders.supplierMismatch'));
      return;
    }
    const newLines: InvoiceLineDraft[] = (order.lines ?? []).map((ln) => ({
      key: `ord-${ln.variant_id}-${Math.random()}`,
      variant: ln.variant_id,
      product: ln.product_id,
      label: `${ln.product_name} — ${ln.size_name}/${ln.color_name}`,
      product_code: ln.product_code,
      name_ar: ln.product_name,
      quantity: ln.quantity,
      unit_cost: '0',
      ...emptyLineDefaults(profitPercent),
    }));
    setLines((prev) => [...prev, ...newLines]);
    setLoadedOrderId(order.id);
    setInfo(`${t('scanOrders.loaded')} ${order.code} — ${order.employee_name}`);
  };

  if (!open) return null;

  const title = editInvoice
    ? t('purchases.form.editInvoice')
    : isReturn
      ? t('purchases.form.newReturn')
      : t('purchases.form.newPurchase');

  const invoiceSupplierName =
    suppliers.find((s) => s.id === header.supplier)?.name_ar || '—';
  const invoiceSeasonName =
    seasons.find((s) => s.id === header.season)?.name_ar || '—';
  const matrixAxes = matrixProduct
    ? productMatrixAxes(matrixProduct, sizes, colors)
    : { sizes: [], colors: [] };

  return (
    <>
      <PurchaseInvoicePremiumView
        isReturn={isReturn}
        isRtl={isRtl}
        title={title}
        user={user}
        suppliers={suppliers}
        seasons={seasons}
        brands={brands}
        sections={sections}
        classifications={classifications}
        warehouses={warehouses}
        header={header}
        setHeader={setHeader}
        profitPercent={profitPercent}
        setProfitPercent={setProfitPercent}
        setLines={setLines}
        searchQ={searchQ}
        setSearchQ={setSearchQ}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchResults={searchResults}
        searchRef={searchRef}
        lines={lines}
        totals={totals}
        error={error}
        info={info}
        saving={saving}
        sourcePurchases={sourcePurchases}
        returnReasons={RETURN_REASONS}
        onClose={onClose}
        onSave={onSave}
        trySelectProduct={trySelectProduct}
        updateLine={updateLine}
        removeLine={removeLine}
        qtyRefs={qtyRefs}
        setSuppliers={setSuppliers}
        setBrands={setBrands}
        setSections={setSections}
        setClassifications={setClassifications}
        createSupplier={createSupplier}
        brandsApiCreate={(name_ar) => brandsApi.create({ name_ar })}
        sectionsApiCreate={(name_ar) => productSectionsApi.create({ name_ar })}
        classificationsApiCreate={(name_ar) => classificationsApi.create({ name_ar })}
        loadFromSourceInvoice={loadFromSourceInvoice}
        toolbarExtra={
          <LoadFromOrderButton
            onLoaded={loadFromScanOrder}
            expectedType={isReturn ? 'purchase_return' : undefined}
          />
        }
        setShowNewProduct={() => openCreateSheet(searchQ)}
        onSearchTab={handleSearchTab}
      />
      {matrixProduct ? (
        <SizeColorMatrix
          productName={matrixProduct.name_ar}
          sizes={matrixAxes.sizes}
          colors={matrixAxes.colors}
          onClose={() => setMatrixProduct(null)}
          onApply={(cells) =>
            applyMatrixToLines(matrixProduct, cells, matrixProduct.purchase_price)
          }
        />
      ) : null}

      {mismatchProduct ? (
        <PurchaseMismatchDialog
          product={mismatchProduct}
          invoiceSupplierName={invoiceSupplierName}
          invoiceSeasonName={invoiceSeasonName}
          onClose={() => setMismatchProduct(null)}
          onCreateNew={() => openCreateSheet(mismatchProduct.name_ar)}
        />
      ) : null}

      {showSearchNotFound ? (
        <PurchaseSearchNotFoundDialog
          searchQ={searchQ}
          onClose={() => setShowSearchNotFound(false)}
          onCreate={() => openCreateSheet(searchQ)}
        />
      ) : null}

      <PurchaseProductCreateSheet
        open={showNewProduct}
        onClose={() => {
          setShowNewProduct(false);
          setError(null);
        }}
        onCreated={onProductCreated}
        searchPrefill={createSearchPrefill}
        header={header}
        profitPercent={profitPercent}
        defaultReorderPercent={defaultReorderPercent}
        suppliers={suppliers}
        seasons={seasons}
        brands={brands}
        sections={sections}
        classifications={classifications}
        sizes={sizes}
        colors={colors}
        supplierName={invoiceSupplierName}
        seasonName={invoiceSeasonName}
        brandsApiCreate={(name_ar) => brandsApi.create({ name_ar })}
        sectionsApiCreate={(name_ar) => productSectionsApi.create({ name_ar })}
        classificationsApiCreate={(name_ar) => classificationsApi.create({ name_ar })}
        onError={setError}
        sheetError={showNewProduct ? error : null}
      />
    </>
  );
}
