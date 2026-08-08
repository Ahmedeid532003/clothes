import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Flame,
  Search,
  Smartphone,
  Star,
  Trash2,
  X,
} from 'lucide-react';


import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  createPosExchange,
  fetchPosCustomerReview,
  searchPosProducts,
  type PosCustomerReviewRow,
  type SaleDto,
} from '@/lib/api/pos';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import { fetchInventorySettings, updateInventorySettings } from '@/lib/api/inventory';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { usePosSession } from './usePosSession';
import { fmtPosAmount, flattenGalleryItems, lineSubtotal } from './pos-utils';
import { PosImportSalesInvoiceModal } from './smart/PosImportSalesInvoiceModal';

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

function lineValue(qty: string, unit: string) {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(unit) || 0;
  return q * p;
}

function sumQty(lines: Array<{ quantity: string }>) {
  return lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0);
}

export function PosExchangeTab({ activeBranchId, onMessage, onError }: Props) {
  const { t, locale } = useLanguage();
  const session = usePosSession(activeBranchId);
  const [customers, setCustomers] = useState<PosCustomerReviewRow[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [barcode, setBarcode] = useState('');
  const [returnBasket, setReturnBasket] = useState<ExchangeReturnLine[]>([]);
  const [importOpen, setImportOpen] = useState(false);
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
      .then(setCustomers)
      .catch(() => {});
    fetchEmployees().then(setEmployees).catch(() => {});
    fetchInventorySettings()
      .then((s) => {
        setForceReturnInvoice(!!s.pos_force_return_from_invoice);
        setRequireSeller(!!s.pos_require_seller_on_scan);
        setCommissionBasis((s.pos_commission_basis as 'seller' | 'product') || 'seller');
      })
      .catch(() => {});
  }, []);

  const quickItems = useMemo(() => flattenGalleryItems(session.quickPicks).slice(0, 3), [session.quickPicks]);

  const returnTotal = useMemo(
    () => returnBasket.reduce((s, r) => s + lineValue(r.quantity, r.unit_price), 0),
    [returnBasket],
  );

  const newTotal = session.cartTotal;
  const disc = parseFloat(discount) || 0;
  const netNew = Math.max(newTotal - disc, 0);
  const difference = netNew - returnTotal;
  const originalPayment = returnBasket[0]?.payment_method || 'cash';
  const balanced = Math.abs(difference) <= 0.01;
  const totalPieces = sumQty(returnBasket) + sumQty(session.cart);

  const netFootNote = useMemo(() => {
    if (balanced) return t('pos.smart.exchange.netBalancedFoot');
    if (difference > 0.01) {
      return originalPayment === 'installment' ? t('pos.exchangePayInstallment') : t('pos.exchangePayCash');
    }
    return originalPayment === 'installment' ? t('pos.exchangeCreditInstallment') : t('pos.exchangeRefundCash');
  }, [balanced, difference, originalPayment, t]);

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

  const recallInvoiceForReturn = (sale: SaleDto) => {
    if (sale.customer) setCustomerId((cid) => cid || sale.customer!);
    setReturnBasket((prev) => {
      const usedMap: Record<string, number> = {};
      for (const r of prev) {
        usedMap[r.saleLineId] = (usedMap[r.saleLineId] || 0) + (parseFloat(r.quantity) || 0);
      }
      const additions: ExchangeReturnLine[] = [];
      for (const ln of sale.lines || []) {
        if (!ln.id || !sale.id) continue;
        const max = parseFloat(ln.quantity) || 0;
        const already = usedMap[ln.id] || 0;
        const take = max - already;
        if (take <= 0) continue;
        const unit = (parseFloat(ln.line_total) / max).toFixed(2);
        additions.push({
          key: `${ln.id}-${Date.now()}-${Math.random()}`,
          saleId: sale.id,
          saleCode: sale.code,
          saleLineId: ln.id,
          product_name: ln.product_name,
          size_name: ln.size_name,
          color_name: ln.color_name,
          quantity: String(take),
          unit_price: unit,
          line_total: (take * parseFloat(unit)).toFixed(2),
          payment_method: sale.payment_method,
        });
      }
      return [...prev, ...additions];
    });
  };

  const handleQuickAdd = async (code: string) => {
    if (requireSeller) {
      setPendingSellerBarcode(code);
      barcodeRef.current?.focus();
      return;
    }
    try {
      await addWithSeller(code);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    }
  };

  const resetAll = () => {
    session.clearCart();
    setReturnBasket([]);
    setDiscount('0');
    setPendingSellerBarcode(null);
    setSellerCode('');
    setBarcode('');
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
      resetAll();
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

  const currency = t('dashboard.currency');
  const fmt = (n: number) => `${fmtPosAmount(n)} ${currency}`;

  return (
    <div className="psc-exchange">
      <section className="psc-ex-summary">
        <article className="psc-ex-sum-card psc-ex-sum-card--return">
          <div className="psc-ex-sum-head">
            <Flame className="h-3 w-3" />
            {t('pos.smart.exchange.returnsTotal').replace('{count}', String(returnBasket.length))}
          </div>
          <div className="psc-ex-sum-value">{fmtPosAmount(returnTotal)}</div>
          <div className="psc-ex-sum-unit">{currency}</div>
          <div className="psc-ex-sum-foot">{t('pos.smart.exchange.returnsFoot')}</div>
        </article>

        <article className="psc-ex-sum-card psc-ex-sum-card--new">
          <div className="psc-ex-sum-head">
            <Flame className="h-3 w-3" />
            {t('pos.smart.exchange.newTotal').replace('{count}', String(session.cart.length))}
          </div>
          <div className="psc-ex-sum-value">{fmtPosAmount(netNew)}</div>
          <div className="psc-ex-sum-unit">{currency}</div>
          <div className="psc-ex-sum-foot">{t('pos.smart.exchange.newFoot')}</div>
        </article>

        <article className="psc-ex-sum-card psc-ex-sum-card--net">
          <div className="psc-ex-sum-head">{t('pos.smart.exchange.netTitle')}</div>
          <div className="psc-ex-sum-value">
            {balanced ? '0' : fmtPosAmount(Math.abs(difference))}
          </div>
          <div className="psc-ex-sum-unit">
            {balanced
              ? t('pos.smart.exchange.netZero')
              : `${difference > 0 ? '+' : '-'} ${currency}`}
          </div>
          <div className="psc-ex-sum-foot">
            {balanced ? (
              <>
                <Star className="inline h-3 w-3 text-amber-300" /> {t('pos.smart.exchange.netBalancedFoot')}
              </>
            ) : (
              netFootNote
            )}
          </div>
        </article>
      </section>

      <div className="psc-ex-step-bar">
        <div className="psc-ex-step-label">
          <span className="psc-ex-step-num">{t('pos.smart.exchange.step1')}</span>
          <span>{t('pos.smart.exchange.step1Hint')}</span>
        </div>
        <button type="button" className="psc-ex-import-btn" onClick={() => setImportOpen(true)}>
          <Search className="h-3.5 w-3.5" />
          {t('pos.smart.exchange.importBtn')}
        </button>
      </div>

      <div className="psc-ex-columns">
        <section className="psc-ex-panel psc-ex-panel--return">
          <header className="psc-ex-panel-head">
            <h3 className="psc-ex-panel-title">
              <span className="psc-ex-dot psc-ex-dot--red" />
              {t('pos.smart.exchange.returnPanelTitle')}
            </h3>
            <span className="psc-ex-count-badge psc-ex-count-badge--red">
              {t('pos.smart.exchange.itemsBadge').replace('{count}', String(returnBasket.length))}
            </span>
          </header>
          <div className="psc-ex-panel-body">
            {returnBasket.length === 0 ? (
              <div className="psc-ex-empty">
                <span className="psc-ex-empty-icon">📦</span>
                <h4>{t('pos.smart.exchange.returnEmptyTitle')}</h4>
                <p>{t('pos.smart.exchange.returnEmptyHint')}</p>
              </div>
            ) : (
              <div className="psc-ex-return-list">
                {returnBasket.map((r) => (
                  <div key={r.key} className="psc-ex-return-row">
                    <div>
                      <strong>{r.product_name}</strong>
                      <span className="text-red-600 ms-1">
                        {r.size_name}/{r.color_name}
                      </span>
                      <span className="block text-[0.58rem] text-slate-500">
                        {r.saleCode} × {r.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <strong>{fmtPosAmount(parseFloat(r.line_total))}</strong>
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() => setReturnBasket((p) => p.filter((x) => x.key !== r.key))}
                        aria-label={t('common.delete')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="psc-ex-panel psc-ex-panel--new">
          <header className="psc-ex-panel-head">
            <h3 className="psc-ex-panel-title">
              <span className="psc-ex-dot psc-ex-dot--blue" />
              {t('pos.smart.exchange.newPanelTitle')}
            </h3>
            <span className="psc-ex-count-badge psc-ex-count-badge--blue">
              {t('pos.smart.exchange.itemsBadge').replace('{count}', String(session.cart.length))}
            </span>
          </header>

          <div className="psc-ex-new-toolbar">
            {pendingSellerBarcode ? (
              <p className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[0.62rem] font-bold text-amber-900">
                {t('pos.exchangeEnterSeller')}: <span className="font-mono">{pendingSellerBarcode}</span>
              </p>
            ) : null}
            <div className="psc-ex-new-scan">
              <input
                ref={barcodeRef}
                value={pendingSellerBarcode ? sellerCode : barcode}
                onChange={(e) => (pendingSellerBarcode ? setSellerCode(e.target.value) : setBarcode(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && void onBarcodeEnter()}
                placeholder={
                  pendingSellerBarcode
                    ? t('pos.exchangeSellerCode')
                    : t('pos.smart.exchange.barcodePlaceholder')
                }
              />
              <button type="button" className="psc-ex-enter-btn" onClick={() => void onBarcodeEnter()}>
                {t('pos.smart.exchange.enterBtn')}
              </button>
            </div>
            <div className="psc-ex-customer-row">
              <label>{t('pos.smart.exchange.beneficiaryCustomer')}</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">{t('pos.walkInCustomer')}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="psc-ex-panel-body">
            {session.cart.length === 0 ? (
              <div className="psc-ex-empty">
                <span className="psc-ex-empty-icon">👕</span>
                <h4>{t('pos.smart.exchange.newEmptyTitle')}</h4>
                <p>{t('pos.smart.exchange.newEmptyHint')}</p>
              </div>
            ) : (
              <div className="psc-ex-cart-list">
                {session.cart.map((line) => (
                  <div key={line.key} className="psc-ex-cart-row">
                    <div>
                      <strong>{line.label}</strong>
                      {line.size_name || line.color_name ? (
                        <span className="text-blue-600 ms-1">
                          {line.size_name}/{line.color_name}
                        </span>
                      ) : null}
                      <span className="block text-[0.58rem] text-slate-500">× {line.quantity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <strong>
                        {fmtPosAmount(
                          lineSubtotal(
                            line.quantity,
                            line.unit_price,
                            line.discount_percent,
                            line.discount_amount,
                          ),
                        )}
                      </strong>
                      <button
                        type="button"
                        className="text-slate-500"
                        onClick={() => session.removeLine(line.key)}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {quickItems.length > 0 ? (
              <div className="psc-ex-quick">
                <h5>{t('pos.smart.exchange.quickFromStock')}</h5>
                <div className="psc-ex-quick-grid">
                  {quickItems.map((item) => {
                    const code = item.variant.barcode || item.product.barcode || item.product.code;
                    const price = item.variant.unit_price || item.product.sale_price;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className="psc-ex-quick-tile"
                        onClick={() => void handleQuickAdd(code)}
                      >
                        <span className="name">{item.product.name_ar}</span>
                        <span className="meta">
                          <span className="code">{item.product.code}</span>
                          <span className="price">
                            {fmtPosAmount(parseFloat(price))} {currency}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <footer className="psc-ex-footer">
        <label className="psc-ex-discount">
          {t('pos.smart.exchange.exceptionalDiscount')}
          <input
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </label>
        <p className="psc-ex-footer-summary">
          {t('pos.smart.exchange.footerSummary')
            .replace('{pieces}', String(totalPieces))
            .replace('{newPaid}', fmt(netNew))
            .replace('{returnDed}', fmt(returnTotal))}
        </p>
        <div className="psc-ex-footer-actions">
          <button
            type="button"
            className="psc-ex-complete-btn"
            disabled={saving || session.loading}
            onClick={() => void completeExchange()}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('pos.smart.exchange.completeSave')}
          </button>
          <button type="button" className="psc-ex-reset-btn" onClick={resetAll}>
            {t('pos.smart.exchange.reset')}
          </button>
        </div>
      </footer>

      <button
        type="button"
        className="psc-buyer-btn"
        onClick={() => onMessage(t('pos.smart.buyerScreen'))}
      >
        <Smartphone className="h-3 w-3" />
        {t('pos.smart.buyerScreen')}
      </button>

      <PosImportSalesInvoiceModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onRecall={recallInvoiceForReturn}
      />

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('pos.exchangeSettings')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={forceReturnInvoice}
                onChange={(e) => setForceReturnInvoice(e.target.checked)}
                className="h-4 w-4"
              />
              {t('pos.exchangeForceInvoice')}
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={requireSeller}
                onChange={(e) => setRequireSeller(e.target.checked)}
                className="h-4 w-4"
              />
              {t('pos.exchangeRequireSeller')}
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('pos.exchangeCommissionBasis')}</label>
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
            <Button onClick={() => void saveSettings()}>{t('common.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
