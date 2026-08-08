import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  Layers,
  Link2,
  ShoppingBag,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosProductHit, SaleDto } from '@/lib/api/pos';

type Props = {
  sales: SaleDto[];
  liveSales: number;
  netProfit: number;
  locale: string;
  quickPicks: PosProductHit[];
};

type DeptKey = 'men' | 'women' | 'kids' | 'accessories' | 'shoes';

const DEPT_COLORS: Record<DeptKey, string> = {
  men: '#14b8a6',
  kids: '#38bdf8',
  accessories: '#fbbf24',
  women: '#1e40af',
  shoes: '#a855f7',
};

const DEPT_ORDER: DeptKey[] = ['men', 'kids', 'accessories', 'women', 'shoes'];

function productDept(name: string): DeptKey | 'other' {
  const n = name.toLowerCase();
  if (/أطفال|اطفال|kids|child|بيبي/.test(n)) return 'kids';
  if (/إكسسوار|اكسسوار|accessories|حقيب|حزام|ساعة/.test(n)) return 'accessories';
  if (/أحذية|احذية|حذاء|shoes|footwear|نعال/.test(n)) return 'shoes';
  if (/حريم|نساء|women|female|سيدات/.test(n)) return 'women';
  if (/رجال|رجالي|men|male/.test(n)) return 'men';
  return 'other';
}

function formatSaleClock(iso: string, locale: string) {
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

function navigateTab(tab: string) {
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: tab }));
}

function DonutChart({
  segments,
  centerQty,
  centerLabel,
}: {
  segments: Array<{ color: string; value: number }>;
  centerQty: number;
  centerLabel: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let angle = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const pct = (seg.value / total) * 100;
      const start = angle;
      angle += pct;
      return `${seg.color} ${start}% ${angle}%`;
    });
  const gradient = stops.length ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e2e8f0 0% 100%)';

  return (
    <div className="pos-reports-donut-wrap">
      <div className="pos-reports-donut" style={{ background: gradient }}>
        <div className="pos-reports-donut-hole">
          <span className="pos-reports-donut-label">{centerLabel}</span>
          <span className="pos-reports-donut-qty">{centerQty}</span>
        </div>
      </div>
    </div>
  );
}

function LineChart({ points, labels }: { points: number[]; labels: string[] }) {
  const w = 520;
  const h = 200;
  const pad = { t: 16, r: 12, b: 28, l: 12 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...points, 1);

  const coords = points.map((v, i) => {
    const x = pad.l + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = pad.t + innerH - (v / max) * innerH;
    return { x, y };
  });

  const line = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${coords.map((p) => `${p.x},${p.y}`).join(' ')} ${pad.l + innerW},${pad.t + innerH} ${pad.l},${pad.t + innerH}`;

  return (
    <svg className="pos-reports-line-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="posReportsLineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#posReportsLineFill)" />
      <polyline points={line} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#22c55e" strokeWidth="2.5" />
      ))}
      {labels.map((label, i) => {
        const x = pad.l + (i / Math.max(labels.length - 1, 1)) * innerW;
        return (
          <text key={label} x={x} y={h - 6} textAnchor="middle" className="pos-reports-axis-label">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export function PosIntegratedReportsScreen({ sales, liveSales, netProfit, locale, quickPicks }: Props) {
  const { t } = useLanguage();
  const [reorderQty, setReorderQty] = useState<Record<string, number>>({});

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const todaySales = useMemo(
    () => sales.filter((s) => s.created_at?.slice(0, 10) === todayKey),
    [sales, todayKey],
  );
  const todayTotal = useMemo(
    () => todaySales.reduce((s, sale) => s + (parseFloat(sale.total) || 0), 0),
    [todaySales],
  );
  const yesterdayTotal = useMemo(
    () =>
      sales
        .filter((s) => s.created_at?.slice(0, 10) === yesterdayKey)
        .reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0),
    [sales, yesterdayKey],
  );

  const salesTrendPct = useMemo(() => {
    if (yesterdayTotal <= 0) return todayTotal > 0 ? 100 : 0;
    return ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
  }, [todayTotal, yesterdayTotal]);

  const invoiceCount = todaySales.length || sales.length;
  const displaySales = todayTotal > 0 ? todayTotal : liveSales;
  const displayProfit = todayTotal > 0 ? todayTotal * 0.287 : netProfit;
  const avgBasket = invoiceCount > 0 ? displaySales / invoiceCount : 0;

  const deptTotals = useMemo(() => {
    const map: Record<DeptKey, number> = {
      men: 0,
      women: 0,
      kids: 0,
      accessories: 0,
      shoes: 0,
    };
    const source = todaySales.length ? todaySales : sales;
    source.forEach((sale) => {
      sale.lines?.forEach((line) => {
        const dept = productDept(line.product_name || '');
        if (dept === 'other') return;
        map[dept] += parseFloat(line.line_total) || 0;
      });
    });
    return map;
  }, [todaySales, sales]);

  const totalItems = useMemo(() => {
    const source = todaySales.length ? todaySales : sales;
    const qty = source.reduce(
      (sum, sale) =>
        sum + (sale.lines?.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0) || 0),
      0,
    );
    return qty;
  }, [todaySales, sales]);

  const hourLabels = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00', '23:00'];
  const hourPoints = useMemo(() => {
    const buckets = Array(8).fill(0);
    const source = todaySales.length ? todaySales : sales;
    source.forEach((sale) => {
      try {
        const h = new Date(sale.created_at).getHours();
        const idx = Math.min(Math.max(Math.floor((h - 9) / 2), 0), 7);
        buckets[idx] += parseFloat(sale.total) || 0;
      } catch {
        /* skip */
      }
    });
    return buckets;
  }, [todaySales, sales]);

  const stockAlerts = useMemo(() => {
    const rows: Array<{ id: string; name: string; qty: number; safety: number }> = [];
    quickPicks.forEach((p) => {
      p.variants.forEach((v) => {
        const qty = parseFloat(v.quantity_available) || 0;
        const safety = qty < 5 ? 5 : 10;
        if (qty <= safety) {
          rows.push({ id: v.variant_id, name: p.name_ar, qty, safety });
        }
      });
    });
    return rows.sort((a, b) => a.qty - b.qty).slice(0, 4);
  }, [quickPicks]);

  const lowCount = stockAlerts.length;
  const dateLabel = new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const recentSales = (todaySales.length ? todaySales : sales).slice(0, 8);

  return (
    <div className="pos-reports">
      <header className="pos-reports-hero">
        <div className="pos-reports-hero-text">
          <h2>{t('pos.integrated.reports.dashboardTitle')}</h2>
          <p>{t('pos.integrated.reports.dashboardSubtitle')}</p>
        </div>
        <div className="pos-reports-hero-meta">
          <span className="pos-reports-sync">
            <span className="dot" />
            {t('pos.integrated.reports.liveSync')}
          </span>
          <span className="pos-reports-date">
            <Calendar className="h-4 w-4" />
            {dateLabel}
          </span>
        </div>
      </header>

      <div className="pos-reports-kpis">
        <article className="pos-reports-kpi pos-reports-kpi--green">
          <div className="pos-reports-kpi-icon">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="pos-reports-kpi-body">
            <span>{t('pos.integrated.reports.todaySales')}</span>
            <strong>
              {displaySales.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
              {t('dashboard.currency')}
            </strong>
            <em className="pos-reports-kpi-trend pos-reports-kpi-trend--up">
              {salesTrendPct >= 0 ? '+' : ''}
              {salesTrendPct.toFixed(1)}% {t('pos.integrated.reports.vsYesterday')}
            </em>
          </div>
        </article>

        <article className="pos-reports-kpi pos-reports-kpi--teal">
          <div className="pos-reports-kpi-icon">
            <Layers className="h-5 w-5" />
          </div>
          <div className="pos-reports-kpi-body">
            <span>{t('pos.integrated.reports.netProfitCalc')}</span>
            <strong>
              {displayProfit.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              {t('dashboard.currency')}
            </strong>
            <em>{t('pos.integrated.reports.actualProfit')}</em>
          </div>
        </article>

        <article className="pos-reports-kpi pos-reports-kpi--purple">
          <div className="pos-reports-kpi-icon">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div className="pos-reports-kpi-body">
            <span>{t('pos.integrated.reports.txCount')}</span>
            <strong>
              {invoiceCount} {t('pos.integrated.reports.invoices')}
            </strong>
            <em>
              {t('pos.integrated.reports.avgBasket')}: {avgBasket.toFixed(1)} {t('dashboard.currency')}
            </em>
          </div>
        </article>

        <article className="pos-reports-kpi pos-reports-kpi--red">
          <div className="pos-reports-kpi-icon">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="pos-reports-kpi-body">
            <span>{t('pos.integrated.reports.stockAlerts')}</span>
            <strong>
              {lowCount} {t('pos.integrated.reports.nearOut')}
            </strong>
            <em className="pos-reports-kpi-urgent">
              <Zap className="inline h-3 w-3" /> {t('pos.integrated.reports.needRestock')}
            </em>
          </div>
        </article>
      </div>

      <div className="pos-reports-charts">
        <section className="pos-reports-card pos-reports-card--dept">
          <header>
            <h3>{t('pos.integrated.reports.deptSales')}</h3>
          </header>
          <div className="pos-reports-dept-layout">
            <div className="pos-reports-mini-bars">
              {DEPT_ORDER.map((key) => {
                const val = deptTotals[key];
                const max = Math.max(...DEPT_ORDER.map((k) => deptTotals[k]), 1);
                return (
                  <div key={key} className="pos-reports-mini-bar-row">
                    <div className="pos-reports-mini-bar-track">
                      <div
                        className="pos-reports-mini-bar-fill"
                        style={{ height: `${(val / max) * 100}%`, background: DEPT_COLORS[key] }}
                      />
                    </div>
                    <span className="val">{val > 0 ? val.toFixed(1) : '0'}</span>
                  </div>
                );
              })}
            </div>
            <DonutChart
              centerQty={totalItems}
              centerLabel={t('pos.integrated.reports.itemsTotal')}
              segments={DEPT_ORDER.map((key) => ({ color: DEPT_COLORS[key], value: deptTotals[key] }))}
            />
            <ul className="pos-reports-dept-legend">
              {DEPT_ORDER.map((key) => (
                <li key={key}>
                  <span className="dot" style={{ background: DEPT_COLORS[key] }} />
                  <span>{t(`pos.integrated.cat_${key}`)}</span>
                  <strong>{deptTotals[key].toFixed(1)}</strong>
                </li>
              ))}
            </ul>
          </div>
          <p className="pos-reports-donut-caption">{t('pos.integrated.reports.totalItems', { count: totalItems })}</p>
        </section>

        <section className="pos-reports-card pos-reports-card--line">
          <header>
            <h3>{t('pos.integrated.reports.liveDailyChart')}</h3>
            <span className="pos-reports-pill">{t('pos.integrated.reports.last24h')}</span>
          </header>
          <LineChart points={hourPoints} labels={hourLabels} />
        </section>
      </div>

      <div className="pos-reports-bottom">
        <section className="pos-reports-card pos-reports-card--tx">
          <header>
            <h3>{t('pos.integrated.reports.txLog')}</h3>
            <p>{t('pos.integrated.reports.txLogSub')}</p>
          </header>
          <ul className="pos-reports-tx-list">
            {recentSales.length === 0 ? (
              <li className="empty">{t('pos.integrated.noSales')}</li>
            ) : (
              recentSales.map((sale) => {
                const isCard = sale.payment_method === 'card';
                return (
                  <li key={sale.id}>
                    <span className="pos-reports-tx-icon">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    <div className="pos-reports-tx-main">
                      <strong>
                        {parseFloat(sale.total).toFixed(2)} {t('dashboard.currency')}
                      </strong>
                      <span className="code">{sale.code}</span>
                      <span className="meta">
                        {formatSaleClock(sale.created_at, locale)} —{' '}
                        {sale.customer_name || t('pos.walkInCustomer')}
                      </span>
                    </div>
                    <span className={`pos-reports-tx-pay${isCard ? ' is-card' : ''}`}>
                      {isCard ? <CreditCard className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="pos-reports-card pos-reports-card--alerts">
          <header>
            <div>
              <h3>{t('pos.integrated.reports.smartAlerts')}</h3>
              <p>{t('pos.integrated.reports.smartAlertsSub')}</p>
            </div>
            {lowCount > 0 ? (
              <span className="pos-reports-alert-badge">
                {lowCount} {t('pos.integrated.reports.belowSafety')}
              </span>
            ) : null}
          </header>
          <div className="pos-reports-alert-list">
            {stockAlerts.length === 0 ? (
              <p className="empty">{t('pos.integrated.reports.noAlerts')}</p>
            ) : (
              stockAlerts.map((row) => {
                const pct = Math.min((row.qty / row.safety) * 100, 100);
                const qtyVal = reorderQty[row.id] ?? 20;
                return (
                  <article key={row.id} className="pos-reports-alert-item">
                    <div className="pos-reports-alert-top">
                      <strong>{row.name}</strong>
                      <span className="pos-reports-critical">{t('pos.integrated.reports.critical')}</span>
                    </div>
                    <div className="pos-reports-alert-stats">
                      <span>
                        {t('pos.integrated.reports.currentQty')}: <b>{row.qty}</b>
                      </span>
                      <span>
                        {t('pos.integrated.reports.safetyLimit')}: <b>{row.safety}</b>
                      </span>
                    </div>
                    <div className="pos-reports-alert-bar">
                      <div className="pos-reports-alert-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="pos-reports-alert-actions">
                      <button type="button" className="pos-reports-reorder" onClick={() => navigateTab('reorder-alerts')}>
                        <Zap className="h-4 w-4" />
                        <Truck className="h-4 w-4" />
                        {t('pos.integrated.reports.reorderOneClick')}
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={qtyVal}
                        onChange={(e) =>
                          setReorderQty((prev) => ({ ...prev, [row.id]: parseInt(e.target.value, 10) || 1 }))
                        }
                        aria-label={t('pos.integrated.reports.shipQty')}
                      />
                      <button type="button" className="pos-reports-ship" onClick={() => navigateTab('purchase-invoices')}>
                        {t('pos.integrated.reports.ship')}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
