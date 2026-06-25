import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ClipboardList,
  FileText,
  Package,
  RotateCcw,
  ScanBarcode,
  Search,
  Settings2,
  ShoppingBag,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  createPosExchange,
  fetchPosCustomerReview,
  fetchPosSales,
  searchPosProducts,
  type PosCartLine,
  type PosCustomerReviewRow,
  type SaleDto,
} from '@/lib/api/pos';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import { fetchInventorySettings, updateInventorySettings } from '@/lib/api/inventory';
import { customerReservationsApi, salesQuotationsApi } from '@/lib/api/sales';
import { scanOrdersApi, type ScanOrderDto } from '@/lib/api/scanOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PosCartPanel } from './PosCartPanel';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import { usePosSession } from './usePosSession';

export type ExchangeReturnLine = {
  key: string;
  saleId: string;
  saleCode: string;
  saleLineId: string;
  product_name: string;
  size_name: string;
  color_name: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  payment_method: string;
};

type Props = {
  activeBranchId: string;
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
};

function lineValue(qty: string, unit: string, disc = '0') {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(unit) || 0;
  const d = parseFloat(disc) || 0;
  return q * p * (1 - d / 100);
}

export function PosExchangeTab({ activeBranchId, onMessage, onError }: Props) {
  const { t, locale } = useLanguage();
  const session = usePosSession(activeBranchId);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [barcode, setBarcode] = useState('');
  const [returnBasket, setReturnBasket] = useState<ExchangeReturnLine[]>([]);
  const [returnSheetOpen, setReturnSheetOpen] = useState(false);
  const [invoiceCode, setInvoiceCode] = useState('');
  const [invoiceSale, setInvoiceSale] = useState<SaleDto | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [forceReturnInvoice, setForceReturnInvoice] = useState(true);
  const [requireSeller, setRequireSeller] = useState(true);
  const [commissionBasis, setCommissionBasis] = useState<'seller' | 'product'>('seller');
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [pendingSellerBarcode, setPendingSellerBarcode] = useState<string | null>(null);
  const [sellerCode, setSellerCode] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosCustomerReview()
      .then((rows) => setCustomers(rows.map((c) => ({ id: c.id, name: c.name_ar }))))
      .catch(() => {});
    fetchEmployees().then(setEmployees).catch(() => {});
    fetchInventorySettings().then((s) => {
      setForceReturnInvoice(!!s.pos_force_return_from_invoice);
      setRequireSeller(!!s.pos_require_seller_on_scan);
      setCommissionBasis((s.pos_commission_basis as 'seller' | 'product') || 'seller');
    }).catch(() => {});
  }, []);

  const returnedQtyByLine = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of returnBasket) {
      map[r.saleLineId] = (map[r.saleLineId] || 0) + (parseFloat(r.quantity) || 0);
    }
    return map;
  }, [returnBasket]);

  const returnTotal = useMemo(
    () => returnBasket.reduce((s, r) => s + lineValue(r.quantity, r.unit_price), 0),
    [returnBasket],
  );

  const newTotal = session.cartTotal;
  const disc = parseFloat(discount) || 0;
  const netNew = Math.max(newTotal - disc, 0);
  const difference = netNew - returnTotal;
  const originalPayment = returnBasket[0]?.payment_method || 'cash';

  const lookupInvoice = async () => {
    if (!invoiceCode.trim()) return;
    setInvoiceLoading(true);
    try {
      const rows = await fetchPosSales(invoiceCode.trim());
      const hit = rows.find((r) => r.code.toLowerCase() === invoiceCode.trim().toLowerCase()) || rows[0];
      if (!hit) {
        onError(t('pos.saleNotFound'));
        return;
      }
      setInvoiceSale(hit);
      if (!customerId && hit.customer) setCustomerId(hit.customer);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const moveToReturn = (ln: NonNullable<SaleDto['lines']>[number], qty = 1) => {
    if (!invoiceSale?.id || !ln.id) return;
    const already = returnedQtyByLine[ln.id] || 0;
    const max = parseFloat(ln.quantity) || 0;
    const remaining = max - already;
    if (remaining <= 0) return;
    const take = Math.min(qty, remaining);
    const unit = (parseFloat(ln.line_total) / max).toFixed(2);
    setReturnBasket((prev) => [
      ...prev,
      {
        key: `${ln.id}-${Date.now()}`,
        saleId: invoiceSale.id,
        saleCode: invoiceSale.code,
        saleLineId: ln.id,
        product_name: ln.product_name,
        size_name: ln.size_name,
        color_name: ln.color_name,
        quantity: String(take),
        unit_price: unit,
        line_total: (take * parseFloat(unit)).toFixed(2),
        payment_method: invoiceSale.payment_method,
      },
    ]);
  };

  const resolveSeller = (code: string) => {
    const c = code.trim().toLowerCase();
    return employees.find(
      (e) =>
        e.employee_code.toLowerCase() === c ||
        e.username.toLowerCase() === c ||
        e.id === code,
    );
  };

  const addWithSeller = async (bc: string, seller?: EmployeeDto) => {
    const results = await searchPosProducts({ barcode: bc.trim() });
    if (results.composites.length === 1 && results.products.length === 0) {
      const b = results.composites[0];
      session.addComposite(b, `${t('pos.bundleOffer')}: ${b.name_ar}`, seller?.id, seller?.full_name);
      return true;
    }
    if (results.products.length === 1 && results.products[0].variants.length === 1 && results.composites.length === 0) {
      session.addVariant(results.products[0], results.products[0].variants[0], seller?.id, seller?.full_name);
      return true;
    }
    onError(t('pos.exchangeMultiHit'));
    return false;
  };

  const onBarcodeEnter = async () => {
    if (pendingSellerBarcode) {
      const seller = resolveSeller(sellerCode);
      if (!seller) {
        onError(t('pos.exchangeSellerNotFound'));
        return;
      }
      try {
        await addWithSeller(pendingSellerBarcode, seller);
        setPendingSellerBarcode(null);
        setSellerCode('');
        setBarcode('');
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Error');
      }
      return;
    }
    const bc = barcode.trim();
    if (!bc) return;
    if (requireSeller) {
      setPendingSellerBarcode(bc);
      setBarcode('');
      return;
    }
    try {
      await addWithSeller(bc);
      setBarcode('');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    }
  };

  const loadScanOrder = async (order: ScanOrderDto) => {
    for (const ln of order.lines || []) {
      const seller = order.employee_id
        ? employees.find((e) => e.id === order.employee_id)
        : undefined;
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
  };

  const loadDocByCode = async (kind: 'quotation' | 'reservation', code: string) => {
    const list =
      kind === 'quotation'
        ? await salesQuotationsApi.list()
        : await customerReservationsApi.list();
    const hit = list.find((d) => d.code.toLowerCase() === code.trim().toLowerCase());
    if (!hit) {
      onError(t('pos.exchangeDocNotFound'));
      return;
    }
    for (const ln of hit.lines) {
      if (ln.variant) {
        session.addVariant(
          {
            id: ln.product_code,
            code: ln.product_code,
            name_ar: ln.product_name,
            barcode: '',
            sale_price: ln.unit_price,
            variants: [
              {
                variant_id: ln.variant!,
                size_name: ln.size_name,
                color_name: ln.color_name,
                barcode: '',
                quantity_available: '999',
                unit_price: ln.unit_price,
                discount_percent: ln.discount_percent,
              },
            ],
          },
          {
            variant_id: ln.variant!,
            size_name: ln.size_name,
            color_name: ln.color_name,
            barcode: '',
            quantity_available: '999',
            unit_price: ln.unit_price,
            discount_percent: ln.discount_percent,
          },
          undefined,
          undefined,
          ln.quantity,
        );
      }
    }
    if (hit.customer) setCustomerId(hit.customer);
  };

  const completeExchange = async () => {
    if (forceReturnInvoice && returnBasket.length === 0) {
      onError(t('pos.exchangeNeedReturn'));
      return;
    }
    if (returnBasket.length === 0 && session.cart.length === 0) {
      onError(t('pos.exchangeEmpty'));
      return;
    }
    setSaving(true);
    session.setError(null);
    try {
      const res = await createPosExchange({
        customer: customerId || undefined,
        return_lines: returnBasket.map((r) => ({
          sale: r.saleId,
          sale_line: r.saleLineId,
          quantity: r.quantity,
        })),
        new_lines: session.cart.map((l) => {
          if (l.kind === 'composite' && l.composite) {
            return {
              composite: l.composite,
              quantity: l.quantity,
              unit_price: l.unit_price,
              discount_percent: l.discount_percent,
              seller: l.seller_id,
            };
          }
          return {
            variant: l.variant,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_percent: l.discount_percent,
            seller: l.seller_id,
          };
        }),
        discount_amount: discount,
        payment_method: originalPayment === 'installment' ? 'installment' : 'cash',
        reason: t('pos.tabExchange'),
      });
      session.clearCart();
      setReturnBasket([]);
      setInvoiceSale(null);
      setInvoiceCode('');
      const note = locale === 'ar' ? res.settlement_ar : res.settlement_en;
      onMessage(`${t('pos.exchangeDone')} ${res.sale_code || res.return_codes.join(', ')} — ${note}`);
      await session.load();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    try {
      await updateInventorySettings({
        pos_force_return_from_invoice: forceReturnInvoice,
        pos_require_seller_on_scan: requireSeller,
        pos_commission_basis: commissionBasis,
      });
      setSettingsOpen(false);
      onMessage(t('pos.exchangeSettingsSaved'));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b bg-gradient-to-r from-red-50 to-white px-4 py-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-red-600" />
          <span className="font-black text-slate-800">{t('pos.tabExchange')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="border-red-300 text-red-700" onClick={() => setReturnSheetOpen(true)}>
            <RotateCcw className="h-4 w-4 me-1" />
            {t('pos.exchangeReturnBtn')}
          </Button>
          <LoadDocButton icon={<ClipboardList className="h-4 w-4" />} label={t('pos.exchangeLoadOrder')} onCode={async (code) => {
            const order = await scanOrdersApi.lookup(code);
            if (order.order_type !== 'sale') {
              onError(t('scanOrders.wrongOrderType'));
              return;
            }
            await loadScanOrder(order);
          }} />
          <LoadDocButton icon={<FileText className="h-4 w-4" />} label={t('pos.exchangeLoadQuote')} onCode={(code) => loadDocByCode('quotation', code)} />
          <LoadDocButton icon={<ShoppingBag className="h-4 w-4" />} label={t('pos.exchangeLoadReservation')} onCode={(code) => loadDocByCode('reservation', code)} />
          <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-0 flex-col">
          {/* Return section — top */}
          <div className="shrink-0 max-h-[42%] min-h-[180px] overflow-auto border-b-4 border-red-200 bg-red-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black text-red-800">
                <Package className="h-4 w-4" />
                {t('pos.exchangeReturnItems')}
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{returnBasket.length}</span>
              </h3>
              <p className="font-black text-red-700">{fmtMoney(returnTotal.toFixed(2))}</p>
            </div>
            {returnBasket.length === 0 ? (
              <p className="py-6 text-center text-sm text-red-400">{t('pos.exchangeReturnEmpty')}</p>
            ) : (
              <div className="space-y-1">
                {returnBasket.map((r) => (
                  <div key={r.key} className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-3 py-2 text-sm">
                    <div>
                      <span className="font-bold text-red-900">{r.product_name}</span>
                      <span className="text-red-600 ms-1">{r.size_name}/{r.color_name}</span>
                      <span className="block text-xs text-slate-500">{r.saleCode} × {r.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{fmtMoney(r.line_total)}</span>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setReturnBasket((p) => p.filter((x) => x.key !== r.key))}>
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New items — bottom */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b bg-emerald-50/50 p-3">
              <p className="mb-2 text-xs font-black uppercase text-emerald-800">{t('pos.exchangeNewItems')}</p>
              {pendingSellerBarcode ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 mb-2 text-sm">
                  <p className="font-bold text-amber-900">{t('pos.exchangeEnterSeller')}</p>
                  <p className="text-xs text-amber-700 font-mono">{pendingSellerBarcode}</p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Input
                  ref={barcodeRef}
                  value={pendingSellerBarcode ? sellerCode : barcode}
                  onChange={(e) => (pendingSellerBarcode ? setSellerCode(e.target.value) : setBarcode(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && onBarcodeEnter()}
                  placeholder={pendingSellerBarcode ? t('pos.exchangeSellerCode') : t('pos.barcodePlaceholder')}
                  className="h-10 font-mono"
                />
                <Button onClick={onBarcodeEnter} className="bg-emerald-700 hover:bg-emerald-800">
                  <ScanBarcode className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <PosCartPanel
                compact
                cart={session.cart}
                cartTotal={session.cartTotal}
                offerDiscountsTotal={session.offerDiscountsTotal}
                discount={discount}
                onDiscountChange={setDiscount}
                customers={customers}
                customerId={customerId}
                onCustomerChange={setCustomerId}
                searchQ=""
                onSearchQChange={() => {}}
                onRemove={session.removeLine}
                onUpdate={session.updateLine}
                onPay={completeExchange}
                onReset={() => { session.clearCart(); setReturnBasket([]); setDiscount('0'); }}
                paying={saving || session.loading}
                payLabel={t('pos.completeExchange')}
                showSeller
              />
            </div>
          </div>
        </div>

        {/* Difference panel */}
        <aside className="min-h-0 overflow-auto border-s border-slate-200 bg-slate-900 p-4 text-white">
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-300">{t('pos.exchangeDifference')}</h3>
          <div className="space-y-3">
            <div className="rounded-xl bg-red-900/40 p-3">
              <p className="text-xs text-red-200">{t('pos.exchangeReturnTotal')}</p>
              <p className="text-2xl font-black">{fmtMoney(returnTotal.toFixed(2))}</p>
            </div>
            <div className="rounded-xl bg-emerald-900/40 p-3">
              <p className="text-xs text-emerald-200">{t('pos.exchangeNewTotal')}</p>
              <p className="text-2xl font-black">{fmtMoney(netNew.toFixed(2))}</p>
            </div>
            <div className={`rounded-xl p-4 ${difference > 0.01 ? 'bg-amber-500' : difference < -0.01 ? 'bg-blue-600' : 'bg-slate-700'}`}>
              <p className="text-xs opacity-90">{t('pos.exchangeNet')}</p>
              <p className="text-3xl font-black">
                {difference > 0.01
                  ? `+${fmtMoney(difference.toFixed(2))}`
                  : difference < -0.01
                    ? `-${fmtMoney(Math.abs(difference).toFixed(2))}`
                    : fmtMoney('0')}
              </p>
              <p className="mt-2 text-xs leading-relaxed opacity-90">
                {difference > 0.01
                  ? originalPayment === 'installment'
                    ? t('pos.exchangePayInstallment')
                    : t('pos.exchangePayCash')
                  : difference < -0.01
                    ? originalPayment === 'installment'
                      ? t('pos.exchangeCreditInstallment')
                      : t('pos.exchangeRefundCash')
                    : t('pos.exchangeBalanced')}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Return invoice side sheet */}
      <Sheet open={returnSheetOpen} onOpenChange={setReturnSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-red-800">{t('pos.exchangeReturnInvoice')}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="flex gap-2">
              <Input
                autoFocus
                value={invoiceCode}
                onChange={(e) => setInvoiceCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookupInvoice()}
                placeholder={t('pos.saleCodePlaceholder')}
                className="font-mono"
              />
              <Button onClick={lookupInvoice} disabled={invoiceLoading} variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {invoiceSale ? (
              <div>
                <p className="mb-3 text-sm font-bold text-slate-600">
                  {invoiceSale.code} — {fmtMoney(invoiceSale.total)} — {invoiceSale.payment_method}
                </p>
                <div className="space-y-2">
                  {invoiceSale.lines?.map((ln) => {
                    const id = ln.id || '';
                    const max = parseFloat(ln.quantity) || 0;
                    const used = returnedQtyByLine[id] || 0;
                    const left = max - used;
                    const exhausted = left <= 0;
                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-2 rounded-xl border p-3 ${exhausted ? 'opacity-40 border-slate-200' : 'border-red-300 bg-red-50'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-red-900 truncate">{ln.product_name}</p>
                          <p className="text-xs text-red-700">{ln.size_name}/{ln.color_name} — {ln.quantity} · {fmtMoney(ln.line_total)}</p>
                          {!exhausted && <p className="text-xs text-slate-500">{t('pos.exchangeRemaining')}: {left}</p>}
                        </div>
                        <Button
                          size="sm"
                          disabled={exhausted}
                          className="shrink-0 bg-red-600 hover:bg-red-700"
                          onClick={() => moveToReturn(ln, 1)}
                          title={t('pos.exchangeMoveToReturn')}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-500 py-8">{t('pos.exchangeInvoiceHint')}</p>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setReturnSheetOpen(false)}>
              {t('common.cancel')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* POS settings */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('pos.exchangeSettings')}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={forceReturnInvoice} onChange={(e) => setForceReturnInvoice(e.target.checked)} className="h-4 w-4" />
              {t('pos.exchangeForceInvoice')}
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={requireSeller} onChange={(e) => setRequireSeller(e.target.checked)} className="h-4 w-4" />
              {t('pos.exchangeRequireSeller')}
            </label>
            <div>
              <label className="text-sm font-medium block mb-1">{t('pos.exchangeCommissionBasis')}</label>
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={commissionBasis}
                onChange={(e) => setCommissionBasis(e.target.value as 'seller' | 'product')}
              >
                <option value="seller">{t('pos.exchangeCommissionSeller')}</option>
                <option value="product">{t('pos.exchangeCommissionProduct')}</option>
              </select>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={saveSettings}>{t('common.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LoadDocButton({
  label,
  icon,
  onCode,
}: {
  label: string;
  icon: React.ReactNode;
  onCode: (code: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await onCode(code.trim());
      setOpen(false);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {icon}
        <span className="hidden md:inline ms-1">{label}</span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-sm">
          <SheetHeader><SheetTitle>{label}</SheetTitle></SheetHeader>
          <div className="py-4">
            <Input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder={t('pos.saleCodePlaceholder')} />
          </div>
          <SheetFooter>
            <Button onClick={load} disabled={loading}>{t('scanOrders.load')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
