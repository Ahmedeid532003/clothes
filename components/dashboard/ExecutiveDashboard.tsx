import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Gauge,
  LayoutGrid,
  Maximize2,
  Minimize2,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type Tone = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';

const toneClasses: Record<Tone, { icon: string; pill: string; glow: string; text: string }> = {
  blue: {
    icon: 'bg-blue-50 text-blue-600 ring-blue-100',
    pill: 'bg-blue-50 text-blue-700 ring-blue-100',
    glow: 'from-blue-500/12 to-cyan-400/5',
    text: 'text-blue-600',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    glow: 'from-emerald-500/14 to-teal-400/5',
    text: 'text-emerald-600',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    pill: 'bg-amber-50 text-amber-700 ring-amber-100',
    glow: 'from-amber-500/14 to-orange-400/5',
    text: 'text-amber-600',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-600 ring-rose-100',
    pill: 'bg-rose-50 text-rose-700 ring-rose-100',
    glow: 'from-rose-500/14 to-pink-400/5',
    text: 'text-rose-600',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-600 ring-violet-100',
    pill: 'bg-violet-50 text-violet-700 ring-violet-100',
    glow: 'from-violet-500/14 to-indigo-400/5',
    text: 'text-violet-600',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-700 ring-slate-200',
    pill: 'bg-slate-100 text-slate-700 ring-slate-200',
    glow: 'from-slate-500/10 to-slate-400/5',
    text: 'text-slate-700',
  },
};

const revenueData = [
  { month: 'Jan', revenue: 82000, target: 76000, profit: 24000 },
  { month: 'Feb', revenue: 91000, target: 80000, profit: 29200 },
  { month: 'Mar', revenue: 88000, target: 84000, profit: 27100 },
  { month: 'Apr', revenue: 118000, target: 90000, profit: 38600 },
  { month: 'May', revenue: 132000, target: 98000, profit: 43100 },
  { month: 'Jun', revenue: 146000, target: 104000, profit: 49200 },
  { month: 'Jul', revenue: 158420, target: 112000, profit: 53600 },
];

const performanceData = [
  { name: 'Sat', sales: 42, orders: 31 },
  { name: 'Sun', sales: 58, orders: 39 },
  { name: 'Mon', sales: 64, orders: 44 },
  { name: 'Tue', sales: 51, orders: 37 },
  { name: 'Wed', sales: 74, orders: 52 },
  { name: 'Thu', sales: 88, orders: 63 },
  { name: 'Fri', sales: 69, orders: 48 },
];

const userStats = [
  { name: 'Active', value: 68, color: '#2563eb' },
  { name: 'Cashiers', value: 22, color: '#10b981' },
  { name: 'Managers', value: 8, color: '#f59e0b' },
  { name: 'Offline', value: 5, color: '#ef4444' },
];

const tasks = [
  { title: 'Approve supplier payment batch', owner: 'Finance', due: 'Today 02:00 PM', progress: 82, tone: 'emerald' as Tone },
  { title: 'Review low-stock reorder alerts', owner: 'Inventory', due: 'Today 04:30 PM', progress: 64, tone: 'amber' as Tone },
  { title: 'Close evening POS shift', owner: 'Operations', due: 'Tonight', progress: 45, tone: 'blue' as Tone },
];

const activities = [
  { icon: ReceiptText, title: 'Sales invoice posted', meta: '#INV-2048 · Downtown branch', time: '3 min ago', tone: 'blue' as Tone },
  { icon: PackageCheck, title: 'Stock transfer completed', meta: 'Warehouse A to Nasr City', time: '21 min ago', tone: 'emerald' as Tone },
  { icon: CreditCard, title: 'Installment payment collected', meta: 'Customer wallet + cash', time: '44 min ago', tone: 'violet' as Tone },
  { icon: AlertTriangle, title: 'Subscription warning acknowledged', meta: 'Owner dashboard', time: '1 hr ago', tone: 'amber' as Tone },
];

const calendarItems = [
  { day: '07', label: 'Payroll review', time: '10:00', tone: 'blue' as Tone },
  { day: '08', label: 'Supplier settlement', time: '12:30', tone: 'emerald' as Tone },
  { day: '09', label: 'Inventory count', time: '18:00', tone: 'amber' as Tone },
];

const expenseBreakdown = [
  { label: 'Supplier payments', value: 48200, percent: 42, tone: 'blue' as Tone },
  { label: 'Payroll & advances', value: 31800, percent: 28, tone: 'emerald' as Tone },
  { label: 'General expenses', value: 21450, percent: 19, tone: 'amber' as Tone },
  { label: 'Utilities & services', value: 12600, percent: 11, tone: 'violet' as Tone },
];

function money(value: number) {
  return value.toLocaleString('en-US');
}

function ExecutiveCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.24 }}
      className={cn(
        'executive-card group relative overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white/90 p-5 shadow-sm shadow-slate-950/5 ring-1 ring-white/70 backdrop-blur-xl transition-all duration-300 hover:border-blue-100 hover:shadow-xl hover:shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900/82 dark:ring-white/5',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      {children}
    </motion.section>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="executive-section-title mb-5 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-50 text-blue-600 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function KpiCard({
  title,
  value,
  suffix,
  trend,
  icon,
  tone,
  description,
}: {
  title: string;
  value: string;
  suffix?: string;
  trend: string;
  icon: React.ReactNode;
  tone: Tone;
  description: string;
}) {
  const toneClass = toneClasses[tone];

  return (
    <ExecutiveCard className="executive-kpi-card min-h-[168px]">
      <div className={cn('absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br blur-sm transition-transform duration-500 group-hover:scale-110', toneClass.glow)} />
      <div className="relative z-10 flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-slate-500 dark:text-slate-400">{title}</p>
            <p className="mt-1 text-xs font-bold text-slate-400">{description}</p>
          </div>
          <span className={cn('grid h-11 w-11 place-items-center rounded-2xl ring-1', toneClass.icon)}>
            {icon}
          </span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <strong className="font-['Times_New_Roman',Times,serif] text-4xl font-bold leading-none text-slate-950 dark:text-white">
              {value}
            </strong>
            {suffix && <span className="ms-1 text-xs font-black text-slate-400">{suffix}</span>}
          </div>
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-black ring-1', toneClass.pill)}>
            {trend}
          </span>
        </div>
      </div>
    </ExecutiveCard>
  );
}

function ExpandableExpenseCard({ isRtl }: { isRtl: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const total = expenseBreakdown.reduce((sum, row) => sum + row.value, 0);

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 650);
  };

  return (
    <ExecutiveCard className={cn('dashboard-control-card', expanded && 'dashboard-control-card-expanded')}>
      <div className="dashboard-control-card-header">
        <div>
          <span>{isRtl ? 'كارت قابل للتكبير' : 'Expandable card'}</span>
          <h2>{isRtl ? 'إجمالي المصروفات' : 'Total Expenses'}</h2>
        </div>
        <div className="dashboard-card-tools">
          <button type="button" onClick={refresh} aria-label={isRtl ? 'تحديث الكارت' : 'Refresh card'}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-pressed={expanded}
            aria-label={isRtl ? (expanded ? 'إغلاق التكبير' : 'تكبير الكارت') : (expanded ? 'Minimize card' : 'Maximize card')}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="dashboard-control-card-main">
        <div>
          <strong>{money(total)}</strong>
          <span>EGP</span>
        </div>
        <p>{isRtl ? 'تفاصيل المنصرف حسب النوع تظهر كاملة عند التكبير.' : 'Click maximize to inspect expense lines and ratios.'}</p>
      </div>

      <div className="dashboard-expense-list">
        {expenseBreakdown.map((row) => (
          <div key={row.label} className="dashboard-expense-row">
            <div>
              <span className={cn('dashboard-expense-dot', `dashboard-expense-dot-${row.tone}`)} />
              <strong>{row.label}</strong>
            </div>
            <span>{money(row.value)} EGP</span>
            <div className="dashboard-expense-bar" aria-label={`${row.label} ${row.percent}%`}>
              <i style={{ width: `${row.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </ExecutiveCard>
  );
}

export function ExecutiveDashboard() {
  const { user, tenant, branches, activeBranchId } = useAuth();
  const { isRtl } = useLanguage();
  const displayName = user?.full_name || user?.username || (isRtl ? 'المدير' : 'Executive');
  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const branchName = activeBranch
    ? activeBranch.name_ar || activeBranch.name_en || activeBranch.code
    : isRtl ? 'كل الفروع' : 'All Branches';

  const copy = {
    eyebrow: isRtl ? 'لوحة القيادة التنفيذية' : 'Executive Command Center',
    title: isRtl ? 'رؤية شاملة لأداء المنشأة' : 'Executive visibility across your ERP',
    subtitle: isRtl
      ? `مرحبًا ${displayName}، تابع الإيرادات، التشغيل، المستخدمين، والمهام من مكان واحد.`
      : `Welcome ${displayName}, monitor revenue, operations, users, and execution from one place.`,
    branch: isRtl ? 'الفرع' : 'Branch',
    export: isRtl ? 'تصدير التقرير' : 'Export report',
    newAction: isRtl ? 'إجراء جديد' : 'New action',
    revenue: isRtl ? 'تحليلات الإيرادات' : 'Revenue Analytics',
    revenueSub: isRtl ? 'مقارنة الإيراد بالهدف وصافي الربح' : 'Revenue, targets, and profit trend',
    users: isRtl ? 'إحصائيات المستخدمين' : 'User Statistics',
    usersSub: isRtl ? 'حالة المستخدمين وأدوار التشغيل' : 'Active users and role distribution',
    activity: isRtl ? 'النشاط الأخير' : 'Recent Activity',
    notifications: isRtl ? 'التنبيهات' : 'Notifications',
    tasks: isRtl ? 'المهام' : 'Tasks',
    calendar: isRtl ? 'التقويم' : 'Calendar',
    quick: isRtl ? 'إجراءات سريعة' : 'Quick Actions',
    performance: isRtl ? 'مؤشرات الأداء' : 'Performance Charts',
    overview: isRtl ? 'نظرة النظام' : 'System Overview',
  };

  return (
    <div className="executive-dashboard mx-auto max-w-[1780px] space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="executive-hero relative overflow-hidden rounded-[1.65rem] border border-slate-100 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/20 md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.35),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(16,185,129,0.22),transparent_30%)]" />
        <div className="executive-hero-orb executive-hero-orb-a" />
        <div className="executive-hero-orb executive-hero-orb-b" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-blue-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">{copy.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-300 md:text-base">{copy.subtitle}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-black text-slate-300">
              <span className="rounded-full bg-white/10 px-3 py-1.5">{tenant?.name ?? 'Ma7aly ERP'}</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">{copy.branch}: {branchName}</span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-emerald-200">99.98% uptime</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white backdrop-blur transition-all hover:bg-white/15 active:scale-[0.98]">
              <Download className="h-4 w-4" />
              {copy.export}
            </button>
            <button className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 shadow-xl shadow-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="h-4 w-4" />
              {copy.newAction}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="executive-insight-strip">
        {[
          [Sparkles, isRtl ? 'اقتراح ذكي' : 'Smart Insight', isRtl ? 'أعد طلب المنتجات الأعلى دورانًا قبل نهاية الأسبوع.' : 'Reorder top-moving products before the weekend rush.'],
          [ShieldCheck, isRtl ? 'جاهزية تشغيلية' : 'Operational Readiness', isRtl ? 'الفروع والخزائن تعمل ضمن الحدود الطبيعية.' : 'Branches and treasuries are operating within healthy limits.'],
          [Zap, isRtl ? 'إجراء سريع' : 'Fast Decision', isRtl ? 'راجع تنبيهات المخزون المنخفض من لوحة واحدة.' : 'Review low-stock alerts from one decision panel.'],
        ].map(([Icon, title, text]) => {
          const InsightIcon = Icon as typeof Sparkles;
          return (
            <div key={String(title)} className="executive-insight-card">
              <span>
                <InsightIcon className="h-4 w-4" />
              </span>
              <div>
                <strong>{String(title)}</strong>
                <p>{String(text)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Revenue" value={money(158420)} suffix="EGP" trend="+18.4%" icon={<DollarSign className="h-5 w-5" />} tone="emerald" description="Net sales after returns" />
        <KpiCard title="Gross Profit" value={money(53600)} suffix="EGP" trend="+11.2%" icon={<TrendingUp className="h-5 w-5" />} tone="blue" description="Margin across branches" />
        <KpiCard title="Active Customers" value="2,842" trend="+7.8%" icon={<Users className="h-5 w-5" />} tone="violet" description="Customers with activity" />
        <KpiCard title="Open Tasks" value="38" trend="-9.1%" icon={<CheckCircle2 className="h-5 w-5" />} tone="amber" description="Pending operational work" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <ExpandableExpenseCard isRtl={isRtl} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <ExecutiveCard className="xl:col-span-8">
          <SectionTitle
            icon={<TrendingUp className="h-5 w-5" />}
            title={copy.revenue}
            subtitle={copy.revenueSub}
            action={<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">+24.8% YoY</span>}
          />
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 8" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 800 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 18px 45px rgb(15 23 42 / 12%)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#revenueFill)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fill="url(#profitFill)" />
                <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 6" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ExecutiveCard>

        <ExecutiveCard className="xl:col-span-4">
          <SectionTitle icon={<Users className="h-5 w-5" />} title={copy.users} subtitle={copy.usersSub} />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={userStats} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={4}>
                  {userStats.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {userStats.map((item) => (
              <div key={item.name} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                <span className="flex items-center gap-2 text-xs font-black text-slate-500">
                  <i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </span>
                <strong className="mt-1 block font-['Times_New_Roman',Times,serif] text-2xl text-slate-950 dark:text-white">{item.value}</strong>
              </div>
            ))}
          </div>
        </ExecutiveCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <ExecutiveCard className="xl:col-span-4">
          <SectionTitle icon={<Activity className="h-5 w-5" />} title={copy.activity} />
          <div className="space-y-3">
            {activities.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3 rounded-2xl p-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl ring-1', toneClasses[item.tone].icon)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-black text-slate-900 dark:text-white">{item.title}</strong>
                    <span className="block truncate text-xs font-bold text-slate-500">{item.meta}</span>
                  </div>
                  <span className="shrink-0 text-[11px] font-black text-slate-400">{item.time}</span>
                </div>
              );
            })}
          </div>
        </ExecutiveCard>

        <ExecutiveCard className="xl:col-span-4">
          <SectionTitle icon={<Bell className="h-5 w-5" />} title={copy.notifications} />
          <div className="space-y-3">
            {[
              ['Inventory', '14 SKUs below reorder threshold', 'amber'],
              ['Payments', '3 overdue installments require follow-up', 'rose'],
              ['Security', 'All backups completed successfully', 'emerald'],
            ].map(([title, meta, tone]) => (
              <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm font-black text-slate-900 dark:text-white">{title}</strong>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-black ring-1', toneClasses[tone as Tone].pill)}>
                    Live
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-500">{meta}</p>
              </div>
            ))}
          </div>
        </ExecutiveCard>

        <ExecutiveCard className="xl:col-span-4">
          <SectionTitle icon={<Target className="h-5 w-5" />} title={copy.tasks} />
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.title} className="space-y-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">{task.title}</strong>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">{task.owner} · {task.due}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-black ring-1', toneClasses[task.tone].pill)}>
                    {task.progress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-700">
                  <div className={cn('h-full rounded-full bg-gradient-to-r', task.tone === 'emerald' ? 'from-emerald-500 to-teal-400' : task.tone === 'amber' ? 'from-amber-500 to-orange-400' : 'from-blue-500 to-cyan-400')} style={{ width: `${task.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ExecutiveCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <ExecutiveCard className="xl:col-span-4">
          <SectionTitle icon={<CalendarDays className="h-5 w-5" />} title={copy.calendar} />
          <div className="space-y-3">
            {calendarItems.map((item) => (
              <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className={cn('grid h-14 w-14 place-items-center rounded-2xl ring-1', toneClasses[item.tone].icon)}>
                  <strong className="font-['Times_New_Roman',Times,serif] text-2xl">{item.day}</strong>
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-black text-slate-900 dark:text-white">{item.label}</strong>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ExecutiveCard>

        <ExecutiveCard className="xl:col-span-4">
          <SectionTitle icon={<Zap className="h-5 w-5" />} title={copy.quick} />
          <div className="grid grid-cols-2 gap-3">
            {[
              [ShoppingBag, 'New Sale', 'sales-invoices', 'blue'],
              [WalletCards, 'Collect Payment', 'installment-collection', 'emerald'],
              [FileText, 'Purchase Invoice', 'purchase-invoices', 'violet'],
              [LayoutGrid, 'Open POS', 'pos', 'amber'],
            ].map(([Icon, label, tab, tone]) => {
              const ActionIcon = Icon as typeof ShoppingBag;
              return (
                <button
                  key={String(tab)}
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('app:navigate', { detail: tab }))}
                  className="group flex min-h-[112px] flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-start shadow-sm transition-all hover:-translate-y-1 hover:border-blue-100 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-slate-900"
                >
                  <span className={cn('grid h-10 w-10 place-items-center rounded-2xl ring-1 transition-transform group-hover:scale-110', toneClasses[tone as Tone].icon)}>
                    <ActionIcon className="h-4 w-4" />
                  </span>
                  <span className="flex items-center justify-between gap-2 text-sm font-black text-slate-900 dark:text-white">
                    {String(label)}
                    <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </ExecutiveCard>

        <ExecutiveCard className="xl:col-span-4">
          <SectionTitle icon={<Gauge className="h-5 w-5" />} title={copy.performance} />
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 10, right: 0, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 8" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 800 }} />
                <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="sales" fill="#2563eb" radius={[10, 10, 0, 0]} />
                <Bar dataKey="orders" fill="#10b981" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ExecutiveCard>
      </div>

      <ExecutiveCard>
        <SectionTitle icon={<ShieldCheck className="h-5 w-5" />} title={copy.overview} subtitle="Operational health, cash flow, inventory, and compliance signals" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Cash Flow Health', 'Excellent', '98%', 'emerald', Activity],
            ['Inventory Accuracy', 'Stable', '94%', 'blue', PackageCheck],
            ['Tax Readiness', 'Ready', '91%', 'violet', ShieldCheck],
            ['Risk Alerts', 'Watch', '12', 'amber', AlertTriangle],
          ].map(([title, status, value, tone, Icon]) => {
            const OverviewIcon = Icon as typeof Activity;
            return (
              <div key={String(title)} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                  <span className={cn('grid h-10 w-10 place-items-center rounded-2xl ring-1', toneClasses[tone as Tone].icon)}>
                    <OverviewIcon className="h-4 w-4" />
                  </span>
                  <strong className={cn('font-["Times_New_Roman",Times,serif] text-3xl', toneClasses[tone as Tone].text)}>{String(value)}</strong>
                </div>
                <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white">{String(title)}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{String(status)} · monitored in real time</p>
              </div>
            );
          })}
        </div>
      </ExecutiveCard>
    </div>
  );
}
