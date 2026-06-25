import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Check,
  Store,
  Package,
  PauseCircle,
  Printer,
  WalletCards,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { entityName } from '@/lib/entity-name';
import {
  createPosSale,
  fetchPosContext,
  fetchPosSales,
  searchPosProducts,
  type PosCartLine,
  type PosCompositeHit,
  type PosContext,
  type PosProductHit,
  type SaleDto,
} from '@/lib/api/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { newLocalId } from './pos-utils';

export function PosPage() {
  const { t } = useLanguage();
  const { activeBranchId, branches, setActiveBranchId } = useAuth();
  const [ctx, setCtx] = useState<PosContext | null>(null);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [heldCarts, setHeldCarts] = useState<Array<{ id: string; label: string; lines: PosCartLine[] }>>([]);
  const [searchQ, setSearchQ] = useState('');
  const [barcode, setBarcode] = useState('');
  const [productHits, setProductHits] = useState<PosProductHit[]>([]);
  const [compositeHits, setCompositeHits] = useState<PosCompositeHit[]>([]);
  const [quickPicks, setQuickPicks] = useState<PosProductHit[]>([]);
  const [sales, setSales] = useState<SaleDto[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [payments, setPayments] = useState<Array<{ payment_method: string; amount: string; reference: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  useEffect(() => {
    const raw = localStorage.getItem('mahaly-pos-held-carts');
    if (raw) setHeldCarts(JSON.parse(raw));
  }, []);

  const persistHeld = (rows: Array<{ id: string; label: string; lines: PosCartLine[] }>) => {
    setHeldCarts(rows);
    localStorage.setItem('mahaly-pos-held-carts', JSON.stringify(rows));
  };

  const focusBarcode = () => {
    setTimeout(() => barcodeRef.current?.focus(), 50);
  };

  const load = useCallback(async () => {
    if (!activeBranchId) {
      setCtx(null);
      setQuickPicks([]);
      return;
    }
    setError(null);
    try {
      const [c, s, stock] = await Promise.all([
        fetchPosContext(),
        fetchPosSales(),
        searchPosProducts({ inStock: true }),
      ]);
      setCtx(c);
      setSales(s);
      setQuickPicks(stock.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, [activeBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    focusBarcode();
  }, [activeBranchId]);

  const clearHits = () => {
    setProductHits([]);
    setCompositeHits([]);
  };

  const addVariant = (product: PosProductHit, v: PosProductHit['variants'][0]) => {
    const key = `v:${v.variant_id}`;
    const label = `${product.name_ar} — ${v.size_name}/${v.color_name}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: String((parseFloat(c.quantity) || 0) + 1) } : c,
        );
      }
      return [
        ...prev,
        {
          key,
          kind: 'variant' as const,
          variant: v.variant_id,
          label,
          quantity: '1',
          unit_price: v.unit_price,
          discount_percent: '0',
          available: v.quantity_available,
        },
      ];
    });
    clearHits();
    setSearchQ('');
    setBarcode('');
    setSuccess(null);
    focusBarcode();
  };

  const addComposite = (bundle: PosCompositeHit) => {
    const key = `c:${bundle.id}`;
    const label = `${t('pos.bundleOffer')}: ${bundle.name_ar}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: String((parseFloat(c.quantity) || 0) + 1) } : c,
        );
      }
      return [
        ...prev,
        {
          key,
          kind: 'composite' as const,
          composite: bundle.id,
          label,
          quantity: '1',
          unit_price: bundle.unit_price,
          discount_percent: '0',
          available: bundle.max_sets_available,
        },
      ];
    });
    clearHits();
    setSearchQ('');
    setBarcode('');
    setSuccess(null);
    focusBarcode();
  };

  const applySearchResults = (results: Awaited<ReturnType<typeof searchPosProducts>>) => {
    setProductHits(results.products);
    setCompositeHits(results.composites);
    return results;
  };

  const runBarcodeSearch = async () => {
    if (!barcode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = applySearchResults(await searchPosProducts({ barcode: barcode.trim() }));
      if (results.composites.length === 1 && results.products.length === 0) {
        addComposite(results.composites[0]);
      } else if (
        results.products.length === 1 &&
        results.products[0].variants.length === 1 &&
        results.composites.length === 0
      ) {
        addVariant(results.products[0], results.products[0].variants[0]);
      } else if (results.products.length + results.composites.length > 0) {
        /* show hits */
      } else {
        setError(t('pos.notFound'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const runTextSearch = async (q: string) => {
    if (!q.trim()) {
      clearHits();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      applySearchResults(await searchPosProducts({ q: q.trim() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQ.trim()) {
      clearHits();
      return;
    }
    searchDebounceRef.current = setTimeout(() => runTextSearch(searchQ), 280);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQ]);

  const cartTotal = cart.reduce((sum, line) => {
    const q = parseFloat(line.quantity) || 0;
    const p = parseFloat(line.unit_price) || 0;
    const d = parseFloat(line.discount_percent) || 0;
    return sum + q * p * (1 - d / 100);
  }, 0);

  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingPayment = Math.max(cartTotal - paymentsTotal, 0);

  const addPaymentRow = () => {
    setPayments([...payments, { payment_method: paymentMethod, amount: remainingPayment.toFixed(2), reference: '' }]);
  };

  const holdCart = () => {
    if (cart.length === 0) return;
    const row = {
      id: newLocalId('held'),
      label: `${new Date().toLocaleTimeString()} — ${cart.length} ${t('pos.items')}`,
      lines: cart,
    };
    persistHeld([row, ...heldCarts].slice(0, 10));
    setCart([]);
    setPayments([]);
    setSuccess(t('pos.cartHeld'));
    focusBarcode();
  };

  const restoreCart = (id: string) => {
    const row = heldCarts.find((x) => x.id === id);
    if (!row) return;
    setCart(row.lines);
    persistHeld(heldCarts.filter((x) => x.id !== id));
    setPayments([]);
  };

  const bumpQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        const next = Math.max(1, (parseFloat(c.quantity) || 1) + delta);
        return { ...c, quantity: String(next) };
      }),
    );
  };

  async function onCheckout(quickCash = false) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const normalizedPayments = quickCash
        ? []
        : payments.map((p) => ({
            ...p,
            amount: (Number(p.amount) || 0).toFixed(2),
          }));
      const sale = await createPosSale({
        payment_method: quickCash
          ? 'cash'
          : normalizedPayments.length > 1
            ? 'mixed'
            : normalizedPayments[0]?.payment_method || paymentMethod,
        payments: normalizedPayments.length ? normalizedPayments : undefined,
        lines: cart.map((l) => {
          if (l.kind === 'composite' && l.composite) {
            return {
              composite: l.composite,
              quantity: l.quantity,
              unit_price: l.unit_price,
              discount_percent: l.discount_percent,
            };
          }
          return {
            variant: l.variant,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_percent: l.discount_percent,
          };
        }),
      });
      setSuccess(`${t('pos.saleDone')} ${sale.code} — ${sale.total}`);
      setCart([]);
      setPayments([]);
      await load();
      focusBarcode();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeRef.current?.focus();
      }
      if (e.key === 'F4' && cart.length > 0) {
        e.preventDefault();
        onCheckout(true);
      }
      if (e.key === 'F6' && cart.length > 0) {
        e.preventDefault();
        holdCart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const hasHits = productHits.length > 0 || compositeHits.length > 0;
  const showQuickPicks = !hasHits && !searchQ.trim() && quickPicks.length > 0;

  const renderHitButton = (p: PosProductHit, v: PosProductHit['variants'][0]) => (
    <button
      key={v.variant_id}
      type="button"
      className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-start shadow-sm transition hover:border-[#4169E1] hover:bg-blue-50/60 hover:shadow-md"
      onClick={() => addVariant(p, v)}
    >
      <span className="font-mono text-[11px] font-black text-[#4169E1]">{p.code}</span>
      <span className="text-sm font-bold text-slate-800 line-clamp-2">{p.name_ar}</span>
      <span className="text-xs text-slate-500">
        {v.size_name} / {v.color_name}
      </span>
      <span className="mt-1 flex items-center justify-between text-xs font-bold">
        <span className="text-emerald-700">{v.unit_price} {t('dashboard.currency')}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
          {t('pos.stock')}: {v.quantity_available}
        </span>
      </span>
    </button>
  );

  if (!activeBranchId || !activeBranch) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <Store className="mx-auto mb-3 h-10 w-10 text-amber-600" />
        <p className="font-semibold text-amber-900">{t('pos.selectBranch')}</p>
        <p className="mt-2 text-sm text-amber-800">{t('pos.branchIsPos')}</p>
        {branches.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {branches.map((b) => (
              <Button key={b.id} size="sm" onClick={() => setActiveBranchId(b.id)}>
                {entityName(b)}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      style={{ minHeight: 'calc(100dvh - 11rem)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 text-white shadow-lg">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('pos.title')}</p>
          <h1 className="text-xl font-black">{activeBranch.name_ar}</h1>
          {ctx && (
            <p className="text-xs text-slate-400">
              {t('inventory.warehouse')}: {ctx.warehouse.name_ar}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-300">
          <kbd className="rounded bg-white/10 px-2 py-1">F2</kbd> {t('pos.focusBarcode')}
          <kbd className="rounded bg-white/10 px-2 py-1">F4</kbd> {t('pos.quickCash')}
          <kbd className="rounded bg-white/10 px-2 py-1">F6</kbd> {t('pos.holdCart')}
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/80 overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-start"
          onClick={() => setShowGuide((v) => !v)}
        >
          <span className="flex items-center gap-2 text-sm font-black text-blue-900">
            <HelpCircle className="h-4 w-4" />
            {t('pos.guideTitle')}
          </span>
          {showGuide ? <ChevronUp className="h-4 w-4 text-blue-700" /> : <ChevronDown className="h-4 w-4 text-blue-700" />}
        </button>
        {showGuide ? (
          <ol className="list-decimal space-y-1.5 border-t border-blue-200/80 px-6 py-3 text-sm text-blue-950">
            <li>{t('pos.guideStep1')}</li>
            <li>{t('pos.guideStep2')}</li>
            <li>{t('pos.guideStep3')}</li>
            <li>{t('pos.guideStep4')}</li>
            <li>{t('pos.guideStep5')}</li>
          </ol>
        ) : null}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{success}</p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="shrink-0 rounded-xl border bg-white p-4 shadow-sm">
            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">
              {t('pos.barcode')}
            </label>
            <div className="flex gap-2">
              <Input
                ref={barcodeRef}
                placeholder={t('pos.barcodePlaceholder')}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runBarcodeSearch()}
                className="h-12 font-mono text-lg"
                autoComplete="off"
              />
              <Button className="h-12 px-5" onClick={runBarcodeSearch} disabled={loading}>
                {t('pos.scan')}
              </Button>
            </div>
            <label className="mb-1 mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
              {t('pos.search')}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('pos.searchPlaceholder')}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="h-11 ps-9"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-white p-3 shadow-sm">
            {hasHits ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {compositeHits.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="flex flex-col gap-1 rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-start hover:border-violet-400"
                    onClick={() => addComposite(b)}
                  >
                    <span className="flex items-center gap-2 font-bold text-violet-900">
                      <Package className="h-4 w-4" />
                      {b.name_ar}
                    </span>
                    <span className="text-xs text-violet-700">
                      {b.unit_price} · {t('pos.bundleSets')}: {b.max_sets_available}
                    </span>
                  </button>
                ))}
                {productHits.map((p) => p.variants.map((v) => renderHitButton(p, v)))}
              </div>
            ) : showQuickPicks ? (
              <>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  {t('pos.quickPicks')}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {quickPicks.flatMap((p) => p.variants.map((v) => renderHitButton(p, v)))}
                </div>
              </>
            ) : searchQ.trim() ? (
              <p className="py-8 text-center text-sm text-slate-500">{loading ? t('inventory.loading') : t('pos.notFound')}</p>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">{t('pos.noStockHint')}</p>
            )}
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-xl border bg-white shadow-lg lg:sticky lg:top-4 lg:max-h-[calc(100dvh-12rem)]">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <ShoppingCart className="h-5 w-5 text-[#4169E1]" />
            <span className="font-black">{t('pos.cart')}</span>
            <span className="ms-auto rounded-full bg-[#4169E1]/10 px-2 py-0.5 text-xs font-black text-[#4169E1]">
              {cart.length}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2">
            {cart.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">{t('pos.cartEmpty')}</p>
            ) : (
              cart.map((line) => (
                <div key={line.key} className="mb-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold leading-snug">{line.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setCart(cart.filter((c) => c.key !== line.key))}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {t('pos.stock')}: {line.available}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => bumpQty(line.key, -1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      className="h-8 w-14 text-center font-black"
                      value={line.quantity}
                      onChange={(e) =>
                        setCart(cart.map((c) => (c.key === line.key ? { ...c, quantity: e.target.value } : c)))
                      }
                    />
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => bumpQty(line.key, 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      className="h-8 flex-1 text-end font-bold"
                      value={line.unit_price}
                      onChange={(e) =>
                        setCart(cart.map((c) => (c.key === line.key ? { ...c, unit_price: e.target.value } : c)))
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 space-y-2 border-t p-3">
            <p className="text-center text-3xl font-black text-slate-900 tabular-nums">
              {cartTotal.toFixed(2)} <span className="text-sm font-bold text-slate-500">{t('dashboard.currency')}</span>
            </p>

            <Button
              className="h-14 w-full bg-gradient-to-r from-emerald-600 to-green-600 text-lg font-black shadow-lg hover:from-emerald-700"
              disabled={cart.length === 0 || loading}
              onClick={() => onCheckout(true)}
            >
              <Zap className="h-5 w-5 me-2" />
              {t('pos.quickCash')} (F4)
            </Button>

            <details className="rounded-lg border bg-slate-50 text-sm">
              <summary className="cursor-pointer px-3 py-2 font-semibold text-slate-700">
                <WalletCards className="inline h-4 w-4 me-1" />
                {t('pos.multiPayment')}
              </summary>
              <div className="space-y-2 border-t px-3 py-2">
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">{t('pos.payCash')}</option>
                  <option value="card">{t('pos.payCard')}</option>
                  <option value="wallet">{t('pos.payWallet')}</option>
                  <option value="credit">{t('pos.payCredit')}</option>
                  <option value="installment">{t('pos.payInstallment')}</option>
                </select>
                <Button type="button" size="sm" variant="outline" className="w-full" onClick={addPaymentRow} disabled={cart.length === 0 || remainingPayment <= 0}>
                  {t('pos.addPayment')}
                </Button>
                {payments.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_28px] gap-1">
                    <select
                      className="rounded-md border px-2 py-1 text-xs"
                      value={p.payment_method}
                      onChange={(e) => setPayments(payments.map((x, i) => (i === idx ? { ...x, payment_method: e.target.value } : x)))}
                    >
                      <option value="cash">{t('pos.payCash')}</option>
                      <option value="card">{t('pos.payCard')}</option>
                      <option value="wallet">{t('pos.payWallet')}</option>
                      <option value="credit">{t('pos.payCredit')}</option>
                      <option value="installment">{t('pos.payInstallment')}</option>
                    </select>
                    <Input className="h-8" value={p.amount} onChange={(e) => setPayments(payments.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)))} />
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPayments(payments.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-slate-500">{t('pos.remaining')}: {remainingPayment.toFixed(2)}</p>
                <Button
                  className="w-full"
                  disabled={cart.length === 0 || loading || (payments.length > 0 && Math.abs(paymentsTotal - cartTotal) > 0.01)}
                  onClick={() => onCheckout(false)}
                >
                  <Check className="h-4 w-4 me-1" />
                  {t('pos.checkout')}
                </Button>
              </div>
            </details>

            <div className="grid grid-cols-3 gap-1.5">
              <Button type="button" variant="outline" size="sm" onClick={holdCart} disabled={cart.length === 0}>
                <PauseCircle className="h-3.5 w-3.5 me-1" />
                {t('pos.holdCart')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setCart([])} disabled={cart.length === 0}>
                {t('pos.clearCart')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {heldCarts.length > 0 && (
        <div className="rounded-xl border bg-white p-3">
          <h2 className="mb-2 text-sm font-black">{t('pos.heldCarts')}</h2>
          <div className="flex flex-wrap gap-2">
            {heldCarts.map((row) => (
              <Button key={row.id} size="sm" variant="outline" onClick={() => restoreCart(row.id)}>
                {row.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {sales.length > 0 && (
        <div className="rounded-xl border bg-white p-3">
          <h2 className="mb-2 text-sm font-black">{t('pos.recentSales')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 text-start">{t('purchases.code')}</th>
                  <th className="py-1 text-start">{t('purchases.total')}</th>
                  <th className="py-1 text-start">{t('purchases.date')}</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 8).map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="py-2 font-mono text-xs">{s.code}</td>
                    <td className="py-2 font-semibold">{s.total}</td>
                    <td className="py-2 text-slate-500">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
