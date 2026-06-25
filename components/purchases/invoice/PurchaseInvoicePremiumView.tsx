import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  Eye,
  Layers,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Undo2,
  User,
  X,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { AuthUser } from '@/lib/api/auth';
import type { CatalogItem, SeasonDto, WarehouseDto } from '@/lib/api/inventory';
import type { PurchaseInvoiceDto, PurchaseProductSearchRow } from '@/lib/api/purchases';
import { calcLineTotals, suggestedSalePrice } from '../lineTotals';
import { PurchaseCatalogField } from '../PurchaseCatalogField';
import { Button } from '@/components/ui/button';
import type { InvoiceLineDraft } from '../types';
import { PI } from './purchase-invoice-theme';

type Totals = {
  sub: number;
  tax: number;
  qty: number;
  lineDisc: number;
  invDisc: number;
  gross: number;
  net: number;
  itemCount: number;
};

export type PurchaseInvoicePremiumViewProps = {
  isReturn: boolean;
  isRtl: boolean;
  title: string;
  user: AuthUser | null;
  suppliers: CatalogItem[];
  seasons: SeasonDto[];
  brands: CatalogItem[];
  sections: CatalogItem[];
  classifications: CatalogItem[];
  warehouses: WarehouseDto[];
  header: {
    supplier: string;
    season: string;
    brand: string;
    section: string;
    classification: string;
    warehouse: string;
    invoice_date: string;
    notes: string;
    discount_amount: string;
    payment_method: 'cash' | 'credit';
    return_reason: string;
    source_invoice: string;
  };
  setHeader: React.Dispatch<React.SetStateAction<PurchaseInvoicePremiumViewProps['header']>>;
  profitPercent: string;
  setProfitPercent: (v: string) => void;
  setLines: React.Dispatch<React.SetStateAction<InvoiceLineDraft[]>>;
  searchQ: string;
  setSearchQ: (v: string) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  searchResults: PurchaseProductSearchRow[];
  searchRef: React.RefObject<HTMLInputElement | null>;
  lines: InvoiceLineDraft[];
  totals: Totals;
  error: string | null;
  info: string | null;
  saving: boolean;
  sourcePurchases: PurchaseInvoiceDto[];
  returnReasons: readonly string[];
  onClose: () => void;
  toolbarExtra?: React.ReactNode;
  onSave: (receive: boolean) => void;
  trySelectProduct: (p: PurchaseProductSearchRow) => void;
  updateLine: (key: string, patch: Partial<InvoiceLineDraft>) => void;
  removeLine: (key: string) => void;
  qtyRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  setSuppliers: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  setBrands: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  setSections: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  setClassifications: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  createSupplier: (payload: Record<string, unknown>) => Promise<unknown>;
  brandsApiCreate: (name_ar: string) => Promise<CatalogItem>;
  sectionsApiCreate: (name_ar: string) => Promise<CatalogItem>;
  classificationsApiCreate: (name_ar: string) => Promise<CatalogItem>;
  loadFromSourceInvoice: () => void;
  setShowNewProduct: (v: boolean) => void;
  onSearchTab: () => void;
};

export function PurchaseInvoicePremiumView(props: PurchaseInvoicePremiumViewProps) {
  const { t } = useLanguage();
  const {
    isReturn,
    isRtl,
    title,
    user,
    suppliers,
    seasons,
    brands,
    sections,
    classifications,
    warehouses,
    header,
    setHeader,
    profitPercent,
    setProfitPercent,
    setLines,
    searchQ,
    setSearchQ,
    searchOpen,
    setSearchOpen,
    searchResults,
    searchRef,
    lines,
    totals,
    error,
    info,
    saving,
    sourcePurchases,
    returnReasons,
    onClose,
    toolbarExtra,
    onSave,
    trySelectProduct,
    updateLine,
    removeLine,
    qtyRefs,
    setSuppliers,
    setBrands,
    setSections,
    setClassifications,
    createSupplier,
    brandsApiCreate,
    sectionsApiCreate,
    classificationsApiCreate,
    loadFromSourceInvoice,
    setShowNewProduct,
    onSearchTab,
  } = props;

  const emptyRows = Math.max(0, 5 - lines.length);

  const stickyCol = (right: number, width: number, head = false) =>
    ({
      position: 'sticky' as const,
      right,
      minWidth: width,
      width,
      maxWidth: width,
      zIndex: head ? 35 : 25,
      background: head ? '#E2E8F0' : undefined,
    });

  const STICKY_ACTION = stickyCol(0, 56);
  const STICKY_MODEL = stickyCol(56, 60);
  const STICKY_DESC = stickyCol(116, 128);
  const STICKY_QTY = stickyCol(300, 58);

  const summaryAside = (
    <aside className="shrink-0 w-[min(230px,26vw)] min-w-[175px]">
      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
        {t('purchases.form.summarySection')}
      </p>
      <div className="rounded-xl border-2 border-slate-800/80 overflow-hidden bg-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
      <table className="w-full text-[11px]">
        <tbody>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            <td className="px-2.5 py-2 font-black text-slate-500">{t('purchases.date')}</td>
            <td className="px-2 py-1">
              <div className="flex items-center gap-1 justify-end">
                <Calendar className="h-3 w-3 text-emerald-500 shrink-0" />
                <input
                  type="date"
                  className="w-full text-end text-[11px] font-black border-0 bg-transparent outline-none"
                  value={header.invoice_date}
                  onChange={(e) => setHeader((h) => ({ ...h, invoice_date: e.target.value }))}
                />
              </div>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-2.5 py-2 font-black text-slate-500">{t('purchases.form.user')}</td>
            <td className="px-2 py-2 text-end">
              <div className="flex items-center gap-1 justify-end font-black text-slate-800 truncate">
                <User className="h-3 w-3 text-violet-500 shrink-0" />
                <span className="truncate max-w-[88px]">{user?.full_name || user?.username || '—'}</span>
              </div>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-2.5 py-2 font-black text-slate-500">{t('purchases.form.totalItems')}</td>
            <td className="px-2.5 py-2 text-end text-lg font-black text-[#4169E1]">{totals.itemCount}</td>
          </tr>
          <tr className="bg-blue-50/50">
            <td className="px-2.5 py-2 font-black text-slate-600">{t('purchases.form.totalQty')}</td>
            <td className="px-2.5 py-2 text-end text-lg font-black text-[#4169E1]">{totals.qty}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </aside>
  );

  const catalogAside = (
    <aside className="shrink-0 w-[min(230px,26vw)] min-w-[175px]">
      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
        {t('purchases.form.catalogSection')}
      </p>
      <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
      <PurchaseCatalogField
        compact
        label={t('purchases.form.supplier')}
        value={header.supplier}
        options={suppliers}
        onChange={(id) => setHeader((h) => ({ ...h, supplier: id }))}
        onCreated={(item) => setSuppliers((p) => [...p, item])}
        createLabel={t('purchases.form.addSupplier')}
        onCreate={async (name_ar) =>
          (await createSupplier({
            name_ar,
            entity_kind: 'establishment',
            settlement_mode: 'credit',
            contact_name: name_ar,
            contact_title: '—',
          })) as CatalogItem
        }
      />
      <PurchaseCatalogField
        compact
        label={t('purchases.form.brand')}
        value={header.brand}
        options={brands}
        allowEmpty
        emptyLabel="—"
        onChange={(id) => setHeader((h) => ({ ...h, brand: id }))}
        onCreated={(item) => setBrands((p) => [...p, item])}
        createLabel={t('purchases.form.addBrand')}
        onCreate={(name_ar) => brandsApiCreate(name_ar)}
      />
      <PurchaseCatalogField
        compact
        label={t('purchases.form.productGroup')}
        value={header.section}
        options={sections}
        allowEmpty
        emptyLabel="—"
        onChange={(id) => setHeader((h) => ({ ...h, section: id }))}
        onCreated={(item) => setSections((p) => [...p, item])}
        createLabel={t('purchases.form.addGroup')}
        onCreate={(name_ar) => sectionsApiCreate(name_ar)}
      />
      <PurchaseCatalogField
        compact
        label={t('purchases.season')}
        value={header.season}
        options={seasons}
        showAdd={false}
        createLabel=""
        onChange={(id) => setHeader((h) => ({ ...h, season: id }))}
        onCreate={async (n) => ({ id: n, name_ar: n })}
      />
      <PurchaseCatalogField
        compact
        label={t('purchases.form.productDepartment')}
        value={header.classification}
        options={classifications}
        allowEmpty
        emptyLabel="—"
        onChange={(id) => setHeader((h) => ({ ...h, classification: id }))}
        onCreated={(item) => setClassifications((p) => [...p, item])}
        createLabel={t('purchases.form.addDepartment')}
        onCreate={(name_ar) => classificationsApiCreate(name_ar)}
      />
      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
          {t('purchases.form.invoiceType')}
        </label>
        <select
          className={PI.select}
          value={header.payment_method}
          onChange={(e) =>
            setHeader((h) => ({ ...h, payment_method: e.target.value as 'cash' | 'credit' }))
          }
        >
          <option value="credit">{t('purchases.payCredit')}</option>
          <option value="cash">{t('purchases.payCash')}</option>
        </select>
      </div>
      </div>
    </aside>
  );

  const mainSection = (
    <main className="flex-1 min-w-[220px] flex flex-col gap-2">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-[110px] shrink-0">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
            {t('purchases.form.margin')}
          </label>
          <div className="relative">
            <input
              type="number"
              className={`${PI.select} text-center text-lg font-black text-[#4169E1] pr-7`}
              value={profitPercent}
              onChange={(e) => {
                setProfitPercent(e.target.value);
                setLines((prev) => prev.map((ln) => ({ ...ln, markup_percent: e.target.value })));
              }}
            />
            <span className="absolute top-1/2 -translate-y-1/2 end-2.5 text-xs font-black text-slate-300">%</span>
          </div>
        </div>
        <select
          className={`${PI.select} w-[130px] shrink-0`}
          value={header.warehouse}
          onChange={(e) => setHeader((h) => ({ ...h, warehouse: e.target.value }))}
          title={t('inventory.warehouse')}
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name_ar}</option>
          ))}
        </select>
        {toolbarExtra}
      </div>

      <div className="relative">
        <div className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <Search className="h-4 w-4 text-[#4169E1]" strokeWidth={2.5} />
        </div>
        <input
          ref={searchRef}
          type="text"
          value={searchQ}
          onChange={(e) => {
            setSearchQ(e.target.value);
            setSearchOpen(e.target.value.trim().length > 0);
          }}
          onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && searchQ.trim()) {
              e.preventDefault();
              onSearchTab();
            }
          }}
          placeholder={t('purchases.form.searchProductsAdvanced')}
          className="w-full h-10 ps-10 pe-4 rounded-xl border-2 border-slate-200 bg-gradient-to-b from-white to-slate-50 text-base font-bold text-slate-800 shadow-[inset_0_2px_6px_rgba(0,0,0,0.04)] outline-none focus:border-[#4169E1] focus:ring-4 focus:ring-[#4169E1]/15 transition-all"
        />
        <p className="mt-1 text-[9px] text-slate-400 font-medium">{t('purchases.form.searchTokenHint')}</p>
        <AnimatePresence>
          {searchOpen && searchQ.trim() ? (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-[calc(100%+6px)] start-0 end-0 z-50 rounded-2xl border-2 border-[#4169E1]/30 bg-white shadow-[0_24px_60px_rgba(65,105,225,0.22)] overflow-hidden"
            >
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full min-w-[820px] border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-[#4169E1] to-indigo-600 text-white">
                    <tr>
                      <th colSpan={3} className="p-2 text-[10px] font-black border-e border-white/20 text-center">
                        {t('purchases.form.columns.itemName')}
                      </th>
                      <th rowSpan={2} className="p-2 text-[10px] font-black border-e border-white/20 text-center w-[72px]">
                        {t('purchases.form.columns.price')}
                      </th>
                      <th rowSpan={2} className="p-2 text-[10px] font-black border-e border-white/20 text-center w-[88px]">
                        {t('purchases.season')}
                      </th>
                      <th rowSpan={2} className="p-2 text-[10px] font-black border-e border-white/20 text-center w-[72px]">
                        {t('purchases.form.columns.sugSale')}
                      </th>
                      <th rowSpan={2} className="p-2 text-[10px] font-black border-e border-white/20 text-center w-[72px]">
                        {t('purchases.form.columns.offerPrice')}
                      </th>
                      <th rowSpan={2} className="p-2 text-[10px] font-black text-center w-[88px]">
                        {t('purchases.form.columns.status')}
                      </th>
                    </tr>
                    <tr>
                      <th className="p-1.5 text-[9px] font-black border-e border-white/15">{t('purchases.form.columns.model')}</th>
                      <th className="p-1.5 text-[9px] font-black border-e border-white/15">{t('purchases.form.columns.description')}</th>
                      <th className="p-1.5 text-[9px] font-black border-e border-white/15">{t('purchases.form.columns.brand')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold italic">
                          {t('purchases.form.noResults')}
                        </td>
                      </tr>
                    ) : (
                      searchResults.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => trySelectProduct(p)}
                          className={`cursor-pointer border-t transition-colors ${
                            p.matches_invoice
                              ? 'bg-white hover:bg-emerald-50/90'
                              : 'bg-slate-100/80 text-slate-500 hover:bg-amber-50/90'
                          }`}
                        >
                          <td className="p-2 text-center font-black text-[#4169E1] border-e border-slate-100">{p.code}</td>
                          <td className="p-2 font-bold text-slate-800 border-e border-slate-100">{p.name_ar}</td>
                          <td className="p-2 text-center text-slate-600 border-e border-slate-100">{p.brand_name || '—'}</td>
                          <td className="p-2 text-center font-black border-e border-slate-100 tabular-nums">{p.purchase_price}</td>
                          <td className={`p-2 text-center font-black border-e border-slate-100 ${p.matches_season ? 'text-orange-600' : 'text-amber-700'}`}>
                            {p.season_name}
                          </td>
                          <td className="p-2 text-center font-black text-emerald-700 border-e border-slate-100 tabular-nums">{p.sale_price}</td>
                          <td className="p-2 text-center font-bold text-violet-700 border-e border-slate-100 tabular-nums">
                            {p.offer_price ?? '—'}
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                                p.matches_invoice
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {p.matches_invoice ? t('purchases.form.matchBadge') : t('purchases.form.compareBadge')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40 px-3 py-2">
                <span className="text-[10px] text-slate-600 font-semibold">{t('purchases.form.searchCompareHint')}</span>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1 rounded-lg bg-[#4169E1] font-black text-[10px] uppercase tracking-wide hover:bg-[#3451b2]"
                  onClick={() => setShowNewProduct(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('purchases.form.addNewProduct')}
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );

  const content = (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[200] flex h-[100dvh] flex-col overflow-hidden bg-[#E8EDF4]"
      data-purchase-invoice-overlay
    >
      {/* ═══ HEADER ثابت ═══ */}
      <header className="shrink-0 z-30 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)] border-b border-slate-200">
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-slate-100"
          style={{ background: 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-lg ${
                isReturn ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-[#4169E1] to-indigo-700'
              }`}
            >
              {isReturn ? <Undo2 className="h-5 w-5 text-white" /> : <ShoppingBag className="h-5 w-5 text-white" />}
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-wide">{title}</h1>
              <p className="text-[10px] text-slate-300 font-medium">{t('purchases.form.fixedHeaderNote')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* هيدر الفاتورة — يمين: قوائم | وسط: بحث | يسار: ملخص */}
        <div className="flex max-h-[min(42vh,360px)] flex-row items-start gap-3 overflow-x-auto overflow-y-auto px-3 py-2.5 min-w-0 overscroll-contain">
          {isRtl ? (
            <>
              {catalogAside}
              {mainSection}
              {summaryAside}
            </>
          ) : (
            <>
              {summaryAside}
              {mainSection}
              {catalogAside}
            </>
          )}
        </div>

        {isReturn ? (
          <div className="flex flex-wrap gap-2 px-3 pb-2 border-t border-slate-100 pt-2 bg-amber-50/40">
            <select className={`${PI.select} w-44`} value={header.return_reason} onChange={(e) => setHeader((h) => ({ ...h, return_reason: e.target.value }))}>
              <option value="">{t('purchases.selectReturnReason')}</option>
              {returnReasons.map((r) => (
                <option key={r} value={r}>{t(`purchases.returnReasons.${r}`)}</option>
              ))}
            </select>
            <select className={`${PI.select} flex-1 min-w-[180px]`} value={header.source_invoice} onChange={(e) => setHeader((h) => ({ ...h, source_invoice: e.target.value }))}>
              <option value="">{t('purchases.sourceInvoiceOptional')}</option>
              {sourcePurchases.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.code} — {inv.invoice_date}</option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" disabled={!header.source_invoice} onClick={loadFromSourceInvoice}>
              {t('purchases.loadFromPurchase')}
            </Button>
          </div>
        ) : null}

        {(error || info) ? (
          <div className="px-3 pb-2 space-y-1">
            {info ? <p className="text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 font-medium">{info}</p> : null}
            {error ? <p className="text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 font-medium">{error}</p> : null}
          </div>
        ) : null}
      </header>

      {/* ═══ جدول الأصناف — الاسكرول بين الحدود السوداء فقط ═══ */}
      <section className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-hidden px-3 py-2">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              {t('purchases.form.itemsSection')}
            </span>
            {lines.length === 0 ? (
              <span className="text-[10px] text-slate-400 italic truncate">{t('purchases.form.searchToAddLines')}</span>
            ) : (
              <span className="text-[10px] font-bold text-[#4169E1] tabular-nums">
                {lines.length} {t('purchases.form.totalItems').toLowerCase()}
              </span>
            )}
          </div>
          {!isReturn ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 shrink-0 rounded-lg bg-[#4169E1] font-black text-[10px] uppercase tracking-wide hover:bg-[#3451b2]"
              onClick={() => setShowNewProduct(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('purchases.form.addNewProduct')}
            </Button>
          ) : null}
        </div>

        {lines.length > 0 ? (
          <div className="shrink-0 flex flex-wrap gap-1.5 rounded-lg border border-blue-200/80 bg-blue-50/50 px-2 py-1.5">
            {lines.map((ln) => (
              <div
                key={`chip-${ln.key}`}
                className="inline-flex max-w-full items-center gap-2 rounded-md border border-white bg-white px-2 py-1 text-[11px] font-bold text-slate-800 shadow-sm"
              >
                <span className="font-mono text-[10px] text-[#4169E1] shrink-0">{ln.product_code || '—'}</span>
                <span className="truncate max-w-[min(180px,32vw)]">{ln.name_ar || ln.label}</span>
                <span className="shrink-0 rounded bg-[#4169E1]/10 px-1.5 py-0.5 text-[10px] font-black text-[#4169E1]">
                  {t('purchases.form.itemsLineChipQty')}: {ln.quantity}
                </span>
                <span className="shrink-0 text-[10px] text-slate-500 tabular-nums">{ln.unit_cost}</span>
              </div>
            ))}
          </div>
        ) : null}

        <p className="shrink-0 text-[10px] font-semibold text-slate-500 px-0.5">
          {t('purchases.form.itemsTableScrollHint')}
        </p>

        <div className="flex flex-1 min-h-0 flex-col border-t-[4px] border-b-[4px] border-black bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain touch-pan-y">
          <table
            className="w-full border-collapse min-w-[1180px] text-[10px]"
            style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 700 }}
          >
            <thead className="sticky top-0 z-20">
              <tr>
                <th rowSpan={2} className={`${PI.th} !text-[9px]`} style={stickyCol(0, 56, true)}>{t('purchases.form.columns.action')}</th>
                <th colSpan={3} className={`${PI.th} !text-[9px]`}>{t('purchases.form.columns.itemName')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] text-[#4169E1]`} style={stickyCol(300, 58, true)}>{t('purchases.form.columns.qty')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[64px]`}>{t('purchases.form.columns.price')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[64px]`}>{t('purchases.form.discountType')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[56px]`}>{t('purchases.form.discountValue')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[72px]`}>{t('purchases.form.lineNet')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[44px]`}>{t('purchases.form.columns.mgn')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[64px] text-emerald-800`}>{t('purchases.form.columns.sugSale')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[44px]`}>{t('purchases.form.columns.stock')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[64px]`}>{t('purchases.form.columns.lastPrice')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[40px]`}>{t('purchases.form.columns.purch')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[40px]`}>{t('purchases.form.columns.card')}</th>
                <th rowSpan={2} className={`${PI.th} !text-[9px] w-[72px] text-orange-800`}>{t('purchases.form.columns.season')}</th>
              </tr>
              <tr>
                <th className={`${PI.th} !text-[9px]`} style={stickyCol(56, 60, true)}>{t('purchases.form.columns.model')}</th>
                <th className={`${PI.th} !text-[9px]`} style={stickyCol(116, 128, true)}>{t('purchases.form.columns.description')}</th>
                <th className={`${PI.th} !text-[9px] w-[56px]`}>{t('purchases.form.columns.brand')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln, idx) => {
                const parts = calcLineTotals(ln);
                const sug = suggestedSalePrice(ln.unit_cost, ln.markup_percent || profitPercent);
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                return (
                  <tr key={ln.key} className={`min-h-[44px] ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50 transition-colors`}>
                    <td className={PI.td} style={{ ...STICKY_ACTION, background: rowBg }}>
                      <div className="flex justify-center gap-0.5 py-0.5">
                        <button type="button" className={`${PI.actionPurple} !h-6 !w-6`} onClick={() => removeLine(ln.key)} title={t('inventory.delete')}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <button type="button" className={`${PI.actionPurple} !h-6 !w-6`} title={t('inventory.edit')}>
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className={`${PI.td} text-center text-[11px] font-black text-slate-800`} style={{ ...STICKY_MODEL, background: rowBg }}>{ln.product_code || '—'}</td>
                    <td className={`${PI.td} px-1.5 text-[11px] font-bold text-slate-700 truncate`} style={{ ...STICKY_DESC, background: rowBg }} title={ln.name_ar || ln.label}>{ln.name_ar || ln.label}</td>
                    <td className={`${PI.td} text-center text-[10px] text-slate-500 w-[56px]`}>{ln.brand_name || '—'}</td>
                    <td className={`${PI.td} shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.15)]`} style={{ ...STICKY_QTY, background: rowBg }}>
                      <input
                        ref={(el) => { qtyRefs.current[ln.key] = el; }}
                        className={`${PI.qtyInput} !h-7 !text-sm`}
                        value={ln.quantity}
                        onChange={(e) => updateLine(ln.key, { quantity: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            searchRef.current?.focus();
                          }
                        }}
                      />
                    </td>
                    <td className={PI.td}>
                      <input
                        className="w-full h-7 text-center text-[10px] font-bold border border-slate-200 rounded-md outline-none focus:border-[#4169E1] px-1"
                        value={ln.unit_cost}
                        onChange={(e) => updateLine(ln.key, { unit_cost: e.target.value })}
                      />
                    </td>
                    <td className={PI.td}>
                      <select
                        className="w-full h-7 text-[9px] font-bold border border-slate-200 rounded-md px-1 outline-none"
                        value={ln.discount_type}
                        onChange={(e) => updateLine(ln.key, { discount_type: e.target.value as 'percent' | 'amount' })}
                      >
                        <option value="percent">%</option>
                        <option value="amount">{t('purchases.form.amount')}</option>
                      </select>
                    </td>
                    <td className={PI.td}>
                      <input
                        className="w-full h-7 text-center text-[10px] font-bold border border-slate-200 rounded-md px-1 outline-none"
                        value={ln.discount_type === 'percent' ? ln.discount_percent : ln.discount_amount}
                        onChange={(e) =>
                          updateLine(ln.key, {
                            ...(ln.discount_type === 'percent'
                              ? { discount_percent: e.target.value }
                              : { discount_amount: e.target.value }),
                          })
                        }
                      />
                    </td>
                    <td className={`${PI.td} text-center text-[11px] font-black text-slate-900 bg-slate-100/60`}>
                      {parts.net.toFixed(2)}
                    </td>
                    <td className={`${PI.td} text-center text-[10px] font-bold text-slate-600`}>
                      {ln.markup_percent || profitPercent}%
                    </td>
                    <td className={`${PI.td} text-center text-[11px] font-black text-emerald-700 bg-emerald-50/50`}>
                      {sug.toFixed(2)}
                    </td>
                    <td className={`${PI.td} text-center text-[10px] font-black text-slate-500`}>
                      {ln.total_stock_qty ?? ln.warehouse_qty ?? '0'}
                    </td>
                    <td className={`${PI.td} text-center text-[10px] italic text-slate-400`}>{ln.sale_price ?? '—'}</td>
                    <td className={`${PI.td} text-center text-[10px] text-slate-500`}>{ln.purchase_count ?? 0}</td>
                    <td className={PI.td}>
                      <div className="flex justify-center py-0.5">
                        <button type="button" className={`${PI.actionPurple} !h-6 !w-6`}>
                          <Eye className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className={`${PI.td} text-center text-[10px] font-black text-orange-700`}>{ln.season_name || '—'}</td>
                  </tr>
                );
              })}
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-10 text-center text-sm font-bold text-slate-400 bg-slate-50/80">
                    {t('purchases.form.searchToAddLines')}
                  </td>
                </tr>
              ) : null}
              {Array.from({ length: emptyRows }).map((_, i) => (
                <tr key={`e-${i}`} className="min-h-[40px] border-b border-slate-100/80">
                  {Array.from({ length: 16 }).map((__, j) => (
                    <td key={j} className="border-e border-slate-100/60 h-10" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ثابت ═══ */}
      <footer
        className={`shrink-0 z-30 flex items-stretch gap-4 border-t-[3px] border-slate-800/80 bg-gradient-to-b from-white to-slate-50 px-4 py-3 shadow-[0_-16px_48px_rgba(15,23,42,0.14)] min-h-[128px] ${
          isRtl ? 'flex-row-reverse' : ''
        }`}
      >
        {/* يسار: أزرار */}
        <div className="flex flex-col justify-center gap-2 shrink-0 w-[140px]">
          <Button
            type="button"
            disabled={lines.length === 0 || saving}
            onClick={() => onSave(true)}
            className="h-11 rounded-xl bg-gradient-to-r from-[#4169E1] to-blue-600 font-black text-sm uppercase tracking-wide text-white shadow-lg shadow-blue-300/40 hover:from-[#3451b2] border-0"
          >
            {isReturn ? t('purchases.saveAndPostReturn') : t('purchases.saveAndReceive')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-xl border-2 border-red-300 bg-gradient-to-b from-red-50 to-white font-black text-sm text-red-600 hover:bg-red-50 hover:border-red-400"
          >
            {t('purchases.form.cancel')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={lines.length === 0 || saving}
            onClick={() => onSave(false)}
            className="h-8 text-[11px] font-bold"
          >
            {t('purchases.saveDraft')}
          </Button>
        </div>

        {/* يمين: إجماليات */}
        <div className="flex flex-1 items-stretch gap-3 justify-end">
          <div className="w-[min(100%,320px)] rounded-xl border-2 border-slate-800/70 overflow-hidden bg-white shadow-inner">
            <table className="w-full text-[12px]">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-2 font-black text-slate-500">{t('purchases.form.totalValue')}</td>
                  <td className="px-3 py-2 text-end font-black text-slate-900 tabular-nums">{totals.gross.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-200 bg-rose-50/30">
                  <td className="px-3 py-2 font-black text-rose-600">{t('purchases.form.invoiceDiscount')}</td>
                  <td className="px-2 py-1">
                    <input
                      className="w-full h-8 text-end font-black text-rose-700 border-2 border-rose-200 rounded-lg px-2 outline-none focus:border-rose-400"
                      value={header.discount_amount}
                      onChange={(e) => setHeader((h) => ({ ...h, discount_amount: e.target.value }))}
                    />
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-2 font-black text-slate-500">{t('purchases.form.totalDiscounts')}</td>
                  <td className="px-3 py-2 text-end font-black text-amber-700 tabular-nums">
                    {(totals.lineDisc + totals.invDisc).toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-gradient-to-r from-slate-900 to-slate-800">
                  <td className="px-3 py-2.5 font-black text-slate-300">{t('purchases.form.netPayable')}</td>
                  <td className="px-3 py-2.5 text-end text-xl font-black text-white tabular-nums">
                    {totals.net.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="hidden lg:flex flex-col justify-center min-w-[140px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase">{t('purchases.form.totalQty')}</span>
            </div>
            <span className="text-2xl font-black text-[#4169E1]">{totals.qty}</span>
          </div>

          <input
            className="flex-1 min-w-[100px] max-w-[280px] self-center h-10 rounded-xl border-2 border-slate-200 px-3 text-sm font-medium outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/15"
            placeholder={t('purchases.notes')}
            value={header.notes}
            onChange={(e) => setHeader((h) => ({ ...h, notes: e.target.value }))}
          />
        </div>
      </footer>
    </div>
  );

  return createPortal(content, document.body);
}
