import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  ChevronLeft,
  Coins,
  DollarSign,
  Home,
  LayoutGrid,
  LayoutList,
  LineChart,
  Megaphone,
  Monitor,
  Package,
  Receipt,
  RotateCcw,
  ScanBarcode,
  Search,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchPosCustomerReview } from '@/lib/api/pos';
import { searchPosProducts } from '@/lib/api/pos';
import { Button } from '@/components/ui/button';
import { flattenGalleryItems, lineSubtotal, productInitials } from './pos-utils';
import { usePosSession } from './usePosSession';
import { PosIntegratedPaymentModal } from './PosIntegratedPaymentModal';
import { playPosAddSound, playPosSuccessSound } from './pos-click-sound';
import { useAccountSeller, sellerLineKey } from './integrated/useAccountSeller';
import { PosIntegratedReportsScreen } from './integrated/PosIntegratedReportsScreen';
import { PosIntegratedWarehouseScreen } from './integrated/PosIntegratedWarehouseScreen';
import { PosIntegratedPromoPanel, type PosActivePromo } from './integrated/PosIntegratedPromoPanel';
import { PosShiftGate } from './PosShiftGate';
import type { PosGalleryItem } from './pos-utils';

type PosScreen = 'integrated' | 'standalone' | 'reports' | 'warehouse';

const CATEGORIES = ['all', 'men', 'women', 'kids', 'accessories', 'shoes'] as const;
type Category = (typeof CATEGORIES)[number];

const EXTRA_DISCOUNT_PCTS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

const BADGE_CLASSES = [
  'pos-integrated-product-badge--violet',
  'pos-integrated-product-badge--blue',
  'pos-integrated-product-badge--pink',
  'pos-integrated-product-badge--orange',
  'pos-integrated-product-badge--teal',
  'pos-integrated-product-badge--slate',
  'pos-integrated-product-badge--amber',
];

function badgeClass(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % BADGE_CLASSES.length;
  return BADGE_CLASSES[hash];
}

type ProductView = 'boxes' | 'grid';

type Props = {
  onClose: () => void;
  initialScreen?: PosScreen;
};

function navigateTab(tab: string) {
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: tab }));
}

function formatClock(d: Date, locale: string) {
  return d.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDate(d: Date, locale: string) {
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'long',
  });
}

function formatSaleTime(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function matchesCategory(name: string, cat: Category) {
  if (cat === 'all') return true;
  const n = name.toLowerCase();
  if (cat === 'men') return /رجال|رجالي|men|male/.test(n);
  if (cat === 'women') return /حريم|نساء|women|female|سيدات/.test(n);
  if (cat === 'kids') return /أطفال|اطفال|kids|child|بيبي|baby/.test(n);
  if (cat === 'accessories') return /إكسسوار|اكسسوار|accessories|حقيب|حزام|ساعة/.test(n);
  if (cat === 'shoes') return /أحذية|احذية|حذاء|shoes|footwear|نعال/.test(n);
  return true;
}

export function PosIntegratedPage({ onClose, initialScreen = 'integrated' }: Props) {
  const { t, isRtl, locale } = useLanguage();
  const { user, tenant, activeBranchId, branches, setActiveBranchId } = useAuth();
  const session = usePosSession(activeBranchId);
  const accountSeller = useAccountSeller(user);

  const [activeScreen, setActiveScreen] = useState<PosScreen>(initialScreen);

  const [searchQ, setSearchQ] = useState('');
  const [galleryItems, setGalleryItems] = useState(flattenGalleryItems(session.quickPicks));
  const [customerId, setCustomerId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [payGateError, setPayGateError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('all');
  const [now, setNow] = useState(() => new Date());
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [productView, setProductView] = useState<ProductView>('boxes');
  const [promoPanelOpen, setPromoPanelOpen] = useState(false);
  const [activePromos, setActivePromos] = useState<PosActivePromo[]>([]);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const brandName = tenant?.name || t('pos.integrated.brandName');
  const userInitial = (user?.full_name || user?.username || '?').trim()[0]?.toUpperCase() || '?';

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchPosCustomerReview()
      .then((rows) => setCustomers(rows.map((c) => ({ id: c.id, name: c.name_ar }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setGalleryItems(flattenGalleryItems(session.quickPicks));
  }, [session.quickPicks]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQ.trim()) {
        setGalleryItems(flattenGalleryItems(session.quickPicks));
        return;
      }
      try {
        const res = await searchPosProducts({ q: searchQ.trim() });
        setGalleryItems(flattenGalleryItems(res.products));
      } catch {
        /* keep */
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQ, session.quickPicks]);

  useEffect(() => {
    setPayGateError(null);
  }, [session.cart]);

  const filteredItems = useMemo(
    () => galleryItems.filter((item) => matchesCategory(item.product.name_ar, category)),
    [galleryItems, category],
  );

  const cartItemCount = useMemo(
    () => session.cart.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0),
    [session.cart],
  );

  const baseTotal = session.cartTotal;
  const discountAmount = (baseTotal * discountPct) / 100;
  const afterDiscount = Math.max(baseTotal - discountAmount, 0);
  const finalTotal = afterDiscount;

  const liveSales = useMemo(
    () => session.sales.reduce((s, sale) => s + (parseFloat(sale.total) || 0), 0),
    [session.sales],
  );

  const netProfit = liveSales * 0.352;
  const shortageCount = useMemo(() => {
    let count = 0;
    session.quickPicks.forEach((p) => {
      p.variants.forEach((v) => {
        if ((parseFloat(v.quantity_available) || 0) < 15) count += 1;
      });
    });
    return count;
  }, [session.quickPicks]);

  const getLineKey = useCallback(
    (variantId: string) => sellerLineKey(variantId, accountSeller.id),
    [accountSeller.id],
  );

  const getQty = useCallback(
    (variantId: string) => {
      const key = getLineKey(variantId);
      const line = session.cart.find((c) => c.key === key);
      return line ? parseFloat(line.quantity) || 0 : 0;
    },
    [session.cart, getLineKey],
  );

  const handleAddVariant = useCallback(
    (item: PosGalleryItem, withSound = true) => {
      session.setError(null);
      if (withSound) playPosAddSound();
      session.addVariant(
        item.product,
        item.variant,
        accountSeller.id,
        accountSeller.full_name,
      );
    },
    [session, accountSeller],
  );

  const handleProductClick = useCallback(
    (item: PosGalleryItem) => {
      handleAddVariant(item, true);
    },
    [handleAddVariant],
  );

  const handleQtyDelta = useCallback(
    (item: PosGalleryItem, delta: number, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const variantId = item.variant.variant_id;
      const key = getLineKey(variantId);
      const qty = getQty(variantId);
      if (delta > 0) {
        if (qty === 0) handleAddVariant(item, true);
        else {
          session.bumpQty(key, delta);
          playPosAddSound();
        }
        return;
      }
      if (qty <= 1) session.removeLine(key);
      else session.bumpQty(key, delta);
    },
    [getLineKey, getQty, handleAddVariant, session],
  );

  const handleRemoveProduct = useCallback(
    (variantId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      session.removeLine(getLineKey(variantId));
    },
    [getLineKey, session],
  );

  const handleExtraDiscount = useCallback(
    (item: PosGalleryItem, pct: number, e: React.SyntheticEvent) => {
      e.stopPropagation();
      const variantId = item.variant.variant_id;
      const key = getLineKey(variantId);
      const existing = session.cart.find((c) => c.key === key);
      if (!existing) {
        session.addVariant(
          item.product,
          item.variant,
          accountSeller.id,
          accountSeller.full_name,
          '1',
          String(pct),
        );
        return;
      }
      session.updateLine(key, { discount_percent: String(pct) });
    },
    [accountSeller, getLineKey, session],
  );

  const validateCartBeforePay = useCallback((): string | null => {
    if (session.cart.length === 0) return t('pos.cartEmpty');
    return null;
  }, [session.cart, t]);

  const openPaymentModal = () => {
    session.setError(null);
    setPayGateError(null);
    const err = validateCartBeforePay();
    if (err) {
      setPayGateError(err);
      return;
    }
    setPaymentOpen(true);
  };

  const handlePaymentConfirm = async (payload: {
    paymentMethod: string;
    payments: Array<{ payment_method: string; amount: string; reference: string }>;
  }) => {
    const sale = await session.checkout({
      customerId: customerId || undefined,
      discountAmount: String(discountAmount.toFixed(2)),
      taxPercent: '0',
      paymentMethod: payload.paymentMethod === 'fawry' ? 'wallet' : payload.paymentMethod,
      payments: payload.payments.map((p) => ({
        ...p,
        payment_method: p.payment_method === 'fawry' ? 'wallet' : p.payment_method,
      })),
    });
    if (sale) {
      playPosSuccessSound();
      setPaymentOpen(false);
      setDiscountPct(0);
    }
  };

  const customerName =
    customers.find((c) => c.id === customerId)?.name || t('pos.walkInCustomer');

  const runScanWithSeller = useCallback(
    async (code: string) => {
      const ok = await session.runBarcode(code, t('pos.integrated.bundle'));
      if (!ok) return false;
      if (accountSeller.id) {
        session.setCart((prev) => {
          if (!prev.length) return prev;
          const lastKey = prev[prev.length - 1].key;
          return prev.map((line) =>
            line.key === lastKey
              ? { ...line, seller_id: accountSeller.id, seller_name: accountSeller.full_name }
              : line,
          );
        });
      }
      return true;
    },
    [session, accountSeller, t],
  );

  const handleScan = async () => {
    const code = searchQ.trim();
    if (!code) {
      barcodeRef.current?.focus();
      return;
    }
    const ok = await runScanWithSeller(code);
    if (ok) {
      playPosAddSound();
      setSearchQ('');
    }
  };

  const handleReset = () => {
    session.clearCart();
    setDiscountPct(0);
    setPayGateError(null);
  };

  const navTabs: { id: PosScreen; label: string; icon: React.ElementType; tone: 'purple' | 'green' | 'blue' | 'amber' }[] = [
    { id: 'integrated', label: t('pos.integrated.tabIntegrated'), icon: Monitor, tone: 'purple' },
    { id: 'standalone', label: t('pos.integrated.tabStandalone'), icon: Briefcase, tone: 'green' },
    { id: 'reports', label: t('pos.integrated.tabReports'), icon: LineChart, tone: 'blue' },
    { id: 'warehouse', label: t('pos.integrated.tabWarehouse'), icon: Package, tone: 'amber' },
  ];

  const showKpis = activeScreen === 'integrated';
  const showRecentSidebar = activeScreen === 'integrated';
  const isSalesScreen = activeScreen === 'integrated' || activeScreen === 'standalone';

  if (!activeBranchId || !activeBranch) {
    return createPortal(
      <div dir={isRtl ? 'rtl' : 'ltr'} className="pos-integrated">
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-amber-600" />
            <p className="font-bold text-amber-900">{t('pos.selectBranch')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {branches.map((b) => (
                <Button key={b.id} onClick={() => setActiveBranchId(b.id)}>
                  {b.name_ar}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  const content = (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="pos-integrated">
      {/* Header */}
      <header className="pos-integrated-header">
        <button type="button" className="pos-integrated-close" onClick={onClose} aria-label={t('pos.integrated.back')}>
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="pos-integrated-brand">
          <div className="pos-integrated-brand-icon">
            <Home className="h-5 w-5" />
          </div>
          <div className="pos-integrated-brand-text">
            <h1>{brandName}</h1>
            <p>{t('pos.integrated.tagline')}</p>
          </div>
        </div>

        <nav className="pos-integrated-nav" aria-label={t('pos.integrated.nav')}>
          {navTabs.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`pos-integrated-nav-btn pos-integrated-nav-btn--${row.tone}${activeScreen === row.id ? ' is-active' : ''}`}
              onClick={() => setActiveScreen(row.id)}
            >
              <row.icon />
              <span>{row.label}</span>
            </button>
          ))}
        </nav>

        <div className="pos-integrated-meta">
          <div className="pos-integrated-clock">
            <div className="time">{formatClock(now, locale)}</div>
            <div className="date">{formatDate(now, locale)}</div>
          </div>
          <div className="pos-integrated-user">
            <div className="pos-integrated-user-info">
              <div className="name">
                {user?.full_name || user?.username || '—'} ({t('pos.integrated.supervisor')})
              </div>
              <div className="status">
                <span className="status-dot" />
                {t('pos.integrated.online')}
              </div>
            </div>
            <div className="pos-integrated-avatar">{userInitial}</div>
          </div>
        </div>
      </header>

      {/* KPIs — integrated screen only */}
      {showKpis ? (
      <div className="pos-integrated-kpis">
        <div className="pos-integrated-kpi">
          <div className="pos-integrated-kpi-icon pos-integrated-kpi-icon--green">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="pos-integrated-kpi-label">{t('pos.integrated.liveSales')}</div>
            <div className="pos-integrated-kpi-value">
              {liveSales.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
              {t('dashboard.currency')}
            </div>
          </div>
        </div>
        <div className="pos-integrated-kpi">
          <div className="pos-integrated-kpi-icon pos-integrated-kpi-icon--green">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="pos-integrated-kpi-label">{t('pos.integrated.netProfit')}</div>
            <div className="pos-integrated-kpi-value">
              {netProfit.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
              {t('dashboard.currency')}
            </div>
          </div>
        </div>
        <div className="pos-integrated-kpi">
          <div className="pos-integrated-kpi-icon pos-integrated-kpi-icon--purple">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="pos-integrated-kpi-label">{t('pos.integrated.invoiceCount')}</div>
            <div className="pos-integrated-kpi-value">
              {session.sales.length} {t('pos.integrated.operations')}
            </div>
          </div>
        </div>
        <div className="pos-integrated-kpi">
          <div className="pos-integrated-kpi-icon pos-integrated-kpi-icon--red">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="pos-integrated-kpi-label">{t('pos.integrated.stockShortages')}</div>
            <div className="pos-integrated-kpi-value">
              {shortageCount} {t('pos.integrated.items')}
            </div>
          </div>
          {shortageCount > 0 ? (
            <button type="button" className="pos-integrated-kpi-action" onClick={() => setActiveScreen('warehouse')}>
              {t('pos.integrated.view')}
            </button>
          ) : null}
        </div>
      </div>
      ) : null}

      {/* Main body */}
      <div
        className={[
          'pos-integrated-body',
          showRecentSidebar ? '' : 'pos-integrated-body--full',
          activeScreen === 'standalone' ? 'pos-integrated-body--standalone' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {activeScreen === 'reports' ? (
          <PosIntegratedReportsScreen
            sales={session.sales}
            liveSales={liveSales}
            netProfit={netProfit}
            locale={locale}
            quickPicks={session.quickPicks}
          />
        ) : null}

        {activeScreen === 'warehouse' ? (
          <PosIntegratedWarehouseScreen
            quickPicks={session.quickPicks}
            warehouseName={session.ctx?.warehouse.name_ar}
            branchName={activeBranch.name_ar}
            onAction={navigateTab}
          />
        ) : null}

        {isSalesScreen ? (
        <>
        <section className="pos-integrated-workspace">
          {activeScreen === 'integrated' ? (
          <h2 className="pos-integrated-workspace-title">{t('pos.integrated.salesScreen')}</h2>
          ) : null}

          {/* Promo */}
          <div className="pos-integrated-promo">
            <div className="pos-integrated-promo-text">
              <Megaphone className="h-5 w-5" />
              {t('pos.integrated.promoBanner')}
            </div>
            <button
              type="button"
              className={`pos-integrated-promo-btn${promoPanelOpen ? ' is-active' : ''}`}
              onClick={() => setPromoPanelOpen((v) => !v)}
            >
              <Tag className="h-4 w-4" />
              {promoPanelOpen ? t('pos.integrated.promo.hidePanel') : t('pos.integrated.promoDashboard')}
            </button>
          </div>

          <PosIntegratedPromoPanel
            open={promoPanelOpen}
            onClose={() => setPromoPanelOpen(false)}
            branchId={activeBranchId}
            products={filteredItems}
            activePromos={activePromos}
            onPromosChange={setActivePromos}
            onApplied={() => void session.load()}
          />

          {/* Toolbar */}
          <div className="pos-integrated-toolbar">
            <div className="pos-integrated-search">
              <Search />
              <input
                ref={barcodeRef}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleScan()}
                placeholder={t('pos.integrated.searchPlaceholder')}
              />
            </div>
            <div className="pos-integrated-chips">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`pos-integrated-chip${category === cat ? ' is-active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {t(`pos.integrated.cat_${cat}`)}
                </button>
              ))}
            </div>
            <span className="pos-integrated-scan-label">
              <ScanBarcode className="h-4 w-4" />
              {t('pos.integrated.laserScan')}
            </span>
            <button type="button" className="pos-integrated-scan-btn" onClick={() => void handleScan()}>
              <Zap className="h-3.5 w-3.5" />
              {t('pos.integrated.scan')}
            </button>
          </div>

          {/* Grid: products (wide) + checkout (narrow) — RTL: products right, checkout left */}
          <div className="pos-integrated-grid">
            {/* Products */}
            <div className="pos-integrated-products">
              <div className="pos-integrated-products-head">
                <span>{t('pos.integrated.productListTitle')}</span>
                <button
                  type="button"
                  className={`pos-integrated-view-toggle${productView === 'boxes' ? ' is-active' : ''}`}
                  onClick={() => setProductView((v) => (v === 'boxes' ? 'grid' : 'boxes'))}
                >
                  {productView === 'boxes' ? <LayoutGrid className="h-3.5 w-3.5" /> : <LayoutList className="h-3.5 w-3.5" />}
                  {t('pos.integrated.viewToggle')}
                  <Zap className="h-3 w-3 text-amber-500" />
                </button>
              </div>
              <div className={`pos-integrated-products-grid${productView === 'grid' ? ' is-grid' : ''}`}>
                {filteredItems.length === 0 ? (
                  <p className="col-span-full py-16 text-center text-sm font-bold text-slate-400">
                    {t('pos.noStockHint')}
                  </p>
                ) : (
                  filteredItems.map((item) => {
                    const { product, variant } = item;
                    const initials = productInitials(product.name_ar, product.code);
                    const qty = getQty(variant.variant_id);
                    const lineKey = getLineKey(variant.variant_id);
                    const cartLine = session.cart.find((c) => c.key === lineKey);
                    const extraDiscPct = parseFloat(cartLine?.discount_percent || '0') || 0;
                    const unitPrice = variant.unit_price;
                    const lineTotal =
                      qty > 0
                        ? lineSubtotal(String(qty), unitPrice, String(extraDiscPct))
                        : 0;
                    return (
                      <div
                        key={item.key}
                        className={`pos-integrated-product${qty > 0 ? ' is-selected' : ''}`}
                        onClick={() => handleProductClick(item)}
                        onKeyDown={(e) => e.key === 'Enter' && handleProductClick(item)}
                        role="button"
                        tabIndex={0}
                      >
                        {qty > 0 ? (
                          <button
                            type="button"
                            className="pos-integrated-product-delete"
                            onClick={(e) => handleRemoveProduct(variant.variant_id, e)}
                            aria-label={t('pos.reset')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                        <div className="pos-integrated-product-top">
                          <span className="pos-integrated-product-stock">
                            {variant.quantity_available} {t('pos.pcs')}
                          </span>
                          <div className="pos-integrated-product-badge-wrap">
                            <span className={`pos-integrated-product-badge ${badgeClass(product.code || product.id)}`}>
                              {initials}
                            </span>
                            <span className="pos-integrated-product-code">{product.code}</span>
                          </div>
                        </div>
                        <div className="pos-integrated-product-body">
                          <div className="pos-integrated-product-name">{product.name_ar}</div>
                          {qty > 0 ? (
                            <div className="pos-integrated-product-pricing">
                              <div className="pos-integrated-product-pricing-col">
                                <span className="label">{t('pos.integrated.unitPrice')}</span>
                                <strong>
                                  {parseFloat(unitPrice).toFixed(1)} {t('dashboard.currency')}
                                </strong>
                              </div>
                              <div className="pos-integrated-product-pricing-col is-total">
                                <span className="label">{t('pos.integrated.lineTotal')}</span>
                                <strong>
                                  {lineTotal.toFixed(1)} {t('dashboard.currency')}
                                </strong>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="pos-integrated-product-price-label">{t('pos.integrated.unitPrice')}</div>
                              <div className="pos-integrated-product-price">
                                {parseFloat(unitPrice).toFixed(1)}{' '}
                                <span className="cur">{t('dashboard.currency')}</span>
                              </div>
                            </>
                          )}
                          <div className="pos-integrated-product-discount-row">
                            <span className="pos-integrated-product-discount">{t('pos.integrated.extraDiscount')}:</span>
                            <select
                              className="pos-integrated-product-discount-select"
                              value={String(extraDiscPct)}
                              disabled={qty === 0}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleExtraDiscount(item, parseInt(e.target.value, 10), e)}
                              aria-label={t('pos.integrated.extraDiscount')}
                            >
                              {EXTRA_DISCOUNT_PCTS.map((n) => (
                                <option key={n} value={String(n)}>
                                  {n === 0
                                    ? t('pos.integrated.noExtraDiscount')
                                    : `${n}%`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="pos-integrated-product-qty" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={(e) => handleQtyDelta(item, -1, e)} aria-label="-">
                            −
                          </button>
                          <span className="count">{qty}</span>
                          <button type="button" onClick={(e) => handleQtyDelta(item, 1, e)} aria-label="+">
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Checkout */}
            <div className="pos-integrated-checkout">
              <div className="mb-3">
                <PosShiftGate />
              </div>
              <div className="pos-integrated-checkout-customer">
                <label>{t('pos.integrated.linkedCustomer')}</label>
                <div className="pos-integrated-customer-row">
                  <div className="pos-integrated-customer-select-wrap">
                    <UserPlus className="pos-integrated-customer-icon" />
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      aria-label={t('pos.integrated.linkedCustomer')}
                    >
                      <option value="">{t('pos.integrated.customerCash', { name: t('pos.walkInCustomer') })}</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {t('pos.integrated.customerCash', { name: c.name })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="pos-integrated-checkout-slider">
                <label>{t('pos.integrated.invoiceDiscountSlider')}</label>
                <div className="pos-integrated-slider-wrap" style={{ '--pct': `${(discountPct / 30) * 100}%` } as React.CSSProperties}>
                  <span className="pos-integrated-slider-badge">{discountPct}%</span>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={discountPct}
                    onChange={(e) => setDiscountPct(parseInt(e.target.value, 10))}
                    aria-label={t('pos.integrated.invoiceDiscountSlider')}
                  />
                </div>
              </div>
              <div className="pos-integrated-checkout-summary">
                <div className="row">
                  <span>{t('pos.integrated.selectedItems')}</span>
                  <strong>
                    {cartItemCount} {t('pos.pcs')}
                  </strong>
                </div>
                <div className="row">
                  <span>{t('pos.integrated.baseTotal')}</span>
                  <strong>{baseTotal.toFixed(2)} {t('dashboard.currency')}</strong>
                </div>
                {discountAmount > 0 ? (
                  <div className="row">
                    <span>{t('pos.invoiceDiscount')}</span>
                    <strong>-{discountAmount.toFixed(2)} {t('dashboard.currency')}</strong>
                  </div>
                ) : null}
              </div>
              <div className="pos-integrated-checkout-total">
                <span>{t('pos.grandTotal')}</span>
                <span className="amount">
                  {finalTotal.toFixed(2)} {t('dashboard.currency')}
                </span>
              </div>
              {payGateError ? <p className="pos-integrated-checkout-error">{payGateError}</p> : null}
              <div className="pos-integrated-checkout-actions">
                <button type="button" className="pos-integrated-checkout-reset" onClick={handleReset} title={t('pos.reset')}>
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="pos-integrated-checkout-pay"
                  disabled={session.cart.length === 0 || session.loading}
                  onClick={openPaymentModal}
                >
                  <Receipt className="h-4 w-4 shrink-0" />
                  {t('pos.integrated.payAndRegister')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {showRecentSidebar ? (
        <aside className="pos-integrated-recent">
          <div className="pos-integrated-recent-head">
            <h2>
              <DollarSign className="h-4 w-4 text-emerald-600" />
              {t('pos.integrated.recentSales')}
            </h2>
            <span className="pos-integrated-live-badge">
              <span className="dot" />
              {t('pos.integrated.liveUpdate')}
            </span>
          </div>
          <div className="pos-integrated-recent-list">
            {session.sales.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs font-bold text-slate-400">{t('pos.integrated.noSales')}</p>
            ) : (
              session.sales.slice(0, 12).map((sale) => (
                <div key={sale.id} className="pos-integrated-sale-row">
                  <span className="code">{sale.code}</span>
                  <div className="meta">
                    <div className="time">
                      {formatSaleTime(sale.created_at, locale)} —{' '}
                      {sale.customer_name || t('pos.walkInCustomer')}
                    </div>
                  </div>
                  <span className="amount">
                    {parseFloat(sale.total).toFixed(2)} {t('dashboard.currency')}
                  </span>
                  <ChevronLeft className="arrow h-4 w-4" />
                </div>
              ))
            )}
          </div>
        </aside>
        ) : null}
        </>
        ) : null}
      </div>

      {session.success ? (
        <div className="pos-integrated-toast pos-integrated-toast--success">
          {t('pos.saleDone')} {session.success}
        </div>
      ) : null}
      {session.error && session.error !== 'MULTI_HIT' && session.error !== 'NOT_FOUND' ? (
        <div className="pos-integrated-toast pos-integrated-toast--error">{session.error}</div>
      ) : null}

      <PosIntegratedPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onConfirm={(payload) => void handlePaymentConfirm(payload)}
        saving={session.loading}
        cart={session.cart}
        subtotal={baseTotal}
        discountAmount={discountAmount}
        finalTotal={finalTotal}
        customerName={customerName}
        cashierName={user?.full_name || user?.username || '—'}
        storeName={brandName}
        branchName={activeBranch.name_ar}
      />
    </div>
  );

  return createPortal(content, document.body);
}
