import React, { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Info,
  LayoutGrid,
  Plus,
  Settings2,
  ShoppingCart,
  FileText,
  UserPlus,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ErpChartContainer } from '@/components/erp/ErpChartContainer';
import { QUICK_ACTIONS } from '@/constants';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatMoneyLocale } from '@/lib/money';
import type { QuickAction } from '@/types';

const ICON_TONE: Record<string, string> = {
  'bg-blue-500': 'blue',
  'bg-green-500': 'green',
  'bg-amber-500': 'amber',
  'bg-purple-500': 'purple',
  'bg-red-500': 'red',
  'bg-cyan-500': 'cyan',
};

const SPARK_POINTS = [12, 18, 16, 22, 28, 26, 34];

function navigateTab(tab: string) {
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: tab }));
}

function PerformanceSparkline() {
  const width = 140;
  const height = 34;
  const max = Math.max(...SPARK_POINTS);
  const min = Math.min(...SPARK_POINTS);
  const points = SPARK_POINTS.map((value, index) => {
    const x = (index / (SPARK_POINTS.length - 1)) * width;
    const y = height - ((value - min) / (max - min || 1)) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="mhome-sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        fill="none"
        stroke="rgb(134 239 172)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function HomeQuickCard({
  action,
  t,
  isRtl,
  onRemove,
  onOpen,
}: {
  action: QuickAction;
  t: (key: string) => string;
  isRtl: boolean;
  onRemove?: () => void;
  onOpen: () => void;
}) {
  const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[action.icon] || LucideIcons.HelpCircle;
  const tone = ICON_TONE[action.color] ?? 'blue';
  const GoIcon = isRtl ? ArrowLeft : ChevronRight;

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="mhome-quick-card"
      onClick={onOpen}
    >
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove"
          className="absolute top-2.5 end-2.5 grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <span className={cn('mhome-quick-icon', tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <h3>{t(action.titleKey)}</h3>
      <p>{t(action.descriptionKey)}</p>
      <span className="mhome-quick-go" aria-hidden>
        <GoIcon className="h-4 w-4" />
      </span>
    </motion.button>
  );
}

export const DashboardHome: React.FC = () => {
  const { t, isRtl, locale } = useLanguage();
  const { user } = useAuth();
  const displayName = user?.username || user?.full_name?.trim() || '';
  const [userRole] = useState<'admin' | 'sales' | 'inventory'>('admin');
  const [favorites, setFavorites] = useState<string[]>(['pos', 'purchase-invoice', 'customer-coding']);
  const [isEditMode, setIsEditMode] = useState(false);

  const money = (value: number) => formatMoneyLocale(value, locale);

  const availableActions = QUICK_ACTIONS.filter(
    (action) => action.requiredPermission.includes(userRole) || action.requiredPermission.includes('admin'),
  );

  const favoriteActionObjects = availableActions.filter((action) => favorites.includes(action.id));
  const suggestedActions = availableActions.filter((action) => !favorites.includes(action.id));

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const weekChart = useMemo(
    () =>
      isRtl
        ? [
            { day: 'السبت', value: 8200 },
            { day: 'الأحد', value: 9100 },
            { day: 'الإثنين', value: 8800 },
            { day: 'الثلاثاء', value: 12540, active: true },
            { day: 'الأربعاء', value: 10800 },
            { day: 'الخميس', value: 11200 },
            { day: 'الجمعة', value: 9800 },
          ]
        : [
            { day: 'Sat', value: 8200 },
            { day: 'Sun', value: 9100 },
            { day: 'Mon', value: 8800 },
            { day: 'Tue', value: 12540, active: true },
            { day: 'Wed', value: 10800 },
            { day: 'Thu', value: 11200 },
            { day: 'Fri', value: 9800 },
          ],
    [isRtl],
  );

  const weekStats = useMemo(
    () => [
      { label: t('home.statSales'), value: formatMoneyLocale(12540, locale), trend: '↑ 8.2%' },
      { label: t('home.statOrders'), value: '48', trend: '↑ 5.1%' },
      { label: t('home.statNewCustomers'), value: '16', trend: '↑ 3.7%' },
      { label: t('home.statTotalRevenue'), value: formatMoneyLocale(18750, locale), trend: '↑ 10.9%' },
    ],
    [t, locale],
  );

  const transactions = useMemo(
    () => [
      {
        id: '1',
        type: 'sale' as const,
        title: `${t('home.txnSale')} #INV-1001`,
        person: isRtl ? 'أحمد محمد' : 'Ahmed Mohamed',
        amount: money(450),
        time: t('home.ago5m'),
      },
      {
        id: '2',
        type: 'purchase' as const,
        title: `${t('home.txnPurchase')} #PUR-882`,
        person: isRtl ? 'مورد النيل' : 'Nile Supplier',
        amount: money(1280),
        time: t('home.ago15m'),
      },
      {
        id: '3',
        type: 'order' as const,
        title: `${t('home.txnOrder')} #ORD-551`,
        person: isRtl ? 'سارة علي' : 'Sara Ali',
        amount: money(320),
        time: t('home.ago1h'),
      },
    ],
    [isRtl, t, locale],
  );

  const alerts = useMemo(
    () => [
      {
        id: '1',
        tone: 'warn' as const,
        icon: AlertTriangle,
        title: t('home.alertOverdueInvoice'),
        desc: t('home.alertOverdueInvoiceDesc'),
      },
      {
        id: '2',
        tone: 'info' as const,
        icon: Info,
        title: t('home.alertLowStock'),
        desc: t('home.alertLowStockDesc'),
      },
      {
        id: '3',
        tone: 'ok' as const,
        icon: CheckCircle2,
        title: t('home.alertSystemUpdate'),
        desc: t('home.alertSystemUpdateDesc'),
      },
    ],
    [t],
  );

  const txnIcon = {
    sale: ShoppingCart,
    purchase: FileText,
    order: UserPlus,
  };

  return (
    <div className="mhome-page">
      <div className="mhome-hero">
        <div className="mhome-welcome">
          <h1>
            {t('home.welcomeBack')} <span>{displayName}</span>
          </h1>
          <p>{t('home.tagline')}</p>
        </div>

        <div className="mhome-perf-card">
          <div className="mhome-perf-label">{t('home.todayPerformance')}</div>
          <div className="mhome-perf-row">
            <span className="mhome-perf-status">{t('home.performanceGood')}</span>
            <span className="mhome-perf-trend">+ 12.5%</span>
          </div>
          <PerformanceSparkline />
        </div>
      </div>

      <section className="mhome-quick-section">
        <div className="mhome-quick-head">
          <h2>
            <LayoutGrid className="h-5 w-5" />
            {t('home.quickAccess')}
          </h2>
          <button
            type="button"
            className={cn('mhome-smart-link', isEditMode && 'is-active')}
            onClick={() => setIsEditMode((value) => !value)}
          >
            <span>{t('home.smartLink')}</span>
            <Settings2 className={cn('h-4 w-4', isEditMode && 'animate-spin')} />
          </button>
        </div>

        <div className="mhome-quick-grid">
          <AnimatePresence mode="popLayout">
            {favoriteActionObjects.map((action) => (
              <HomeQuickCard
                key={action.id}
                action={action}
                t={t}
                isRtl={isRtl}
                onRemove={isEditMode ? () => toggleFavorite(action.id) : undefined}
                onOpen={() => {
                  if (!isEditMode) navigateTab(action.tab);
                }}
              />
            ))}

            {isEditMode &&
              suggestedActions.map((action) => (
                <motion.button
                  key={action.id}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.85 }}
                  className="mhome-add-slot"
                  onClick={() => toggleFavorite(action.id)}
                >
                  <Plus className="h-5 w-5 mb-2" />
                  <span className="text-xs font-bold">{t(action.titleKey)}</span>
                </motion.button>
              ))}
          </AnimatePresence>

          {!isEditMode && favoriteActionObjects.length === 0 ? (
            <div className="mhome-empty">{t('home.noFavorites')}</div>
          ) : null}
        </div>
      </section>

      <div className="mhome-bottom-grid">
        <section className="mhome-panel">
          <div className="mhome-panel-head">
            <h2>{t('home.weeklySummary')}</h2>
          </div>
          <div className="mhome-stat-grid">
            {weekStats.map((stat) => (
              <div key={stat.label} className="mhome-stat">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <em>{stat.trend}</em>
              </div>
            ))}
          </div>
          <ErpChartContainer className="mhome-chart-wrap" minHeight="11.5rem">
            <LineChart data={weekChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} dy={8} />
                <YAxis hide domain={['dataMin - 500', 'dataMax + 500']} />
                <Tooltip
                  formatter={(value: number) => [money(value), t('home.statSales')]}
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontFamily: 'Cairo, sans-serif',
                    fontWeight: 800,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={2.8}
                  dot={(props) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { active?: boolean } };
                    if (!payload?.active) return null;
                    return (
                      <circle cx={cx} cy={cy} r={5} fill="#2563eb" stroke="#ffffff" strokeWidth={2} />
                    );
                  }}
                  activeDot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                />
            </LineChart>
          </ErpChartContainer>
        </section>

        <section className="mhome-panel">
          <div className="mhome-panel-head">
            <h2>{t('home.recentTransactions')}</h2>
            <button type="button" className="mhome-panel-link" onClick={() => navigateTab('sales-invoices')}>
              {t('home.viewAll')}
            </button>
          </div>
          <div className="mhome-txn-list">
            {transactions.map((row) => {
              const Icon = txnIcon[row.type];
              return (
                <div key={row.id} className="mhome-txn">
                  <span className={cn('mhome-txn-icon', row.type)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="mhome-txn-body">
                    <strong>{row.title}</strong>
                    <span>{row.person}</span>
                  </div>
                  <div className="mhome-txn-meta">
                    <strong>{row.amount}</strong>
                    <span>{row.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mhome-txn-footer">
            <button type="button" onClick={() => navigateTab('sales-invoices')}>
              {t('home.viewAllTransactions')}
              {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </section>

        <section className="mhome-panel">
          <div className="mhome-panel-head">
            <h2>{t('home.alerts')}</h2>
            <button type="button" className="mhome-panel-link" onClick={() => navigateTab('reorder-alerts')}>
              {t('home.viewAll')}
            </button>
          </div>
          <div className="mhome-alert-list">
            {alerts.map((alert) => (
              <div key={alert.id} className="mhome-alert">
                <span className={cn('mhome-alert-icon', alert.tone)}>
                  <alert.icon className="h-4 w-4" />
                </span>
                <div>
                  <strong>{alert.title}</strong>
                  <span>{alert.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
