import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  ArrowUpDown,
  Banknote,
  Calendar,
  Check,
  CreditCard,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Landmark,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiRequestError } from '@/lib/api/errors';
import { fetchSeasons, type SeasonDto } from '@/lib/api/inventory';
import { fetchSuppliers } from '@/lib/api/inventory';
import { consumeOpenDocument } from '@/lib/navigation/openDocument';
import {
  approveSupplierPayment,
  createSupplierPayment,
  fetchSupplierPayments,
  type SupplierPaymentDto,
  type SupplierPaymentMethod,
} from '@/lib/api/suppliers';
import {
  printSupplierPaymentVoucher,
  SupplierPaymentVoucherPreview,
  type PaymentVoucherLabels,
} from '@/components/suppliers/SupplierPaymentVoucherPrint';
import { OptionCardGrid } from '@/components/suppliers/OptionCardGrid';
import { ErpCrudPage } from '@/components/erp/ErpCrudPage';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import { PaymentAmountHero } from '@/components/accounting/PaymentAmountHero';
import { AlertBanner, fmtMoney, PageToolbar, StatusBadge } from '@/components/accounting/AccountingUi';
import { bankAccountsApi, type BankAccountDto } from '@/lib/api/banking';
import { isPaperPaymentMethod, navigateToPaymentCheques } from '@/lib/payment-papers';
import { showPremiumToast } from '@/components/ui/premium-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyAmountInput } from '@/components/ui/MoneyAmountInput';
import { isPositiveMoneyAmount, parseMoneyAmount, toApiMoneyAmount } from '@/lib/money';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'supplier';

type PaymentForm = {
  supplier: string;
  season: string;
  amount: string;
  payment_date: string;
  payment_method: SupplierPaymentMethod;
  notes: string;
  paper_cheque_number: string;
  paper_bank_account: string;
  paper_due_date: string;
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  cheque: <FileText className="h-4 w-4" />,
  promissory_note: <Landmark className="h-4 w-4" />,
  other_papers: <FileText className="h-4 w-4" />,
  bank: <Landmark className="h-4 w-4" />,
  bank_account: <CreditCard className="h-4 w-4" />,
  wallet: <Smartphone className="h-4 w-4" />,
};

const STATUS_MAP: Record<string, 'draft' | 'posted' | 'cancelled'> = {
  draft: 'draft',
  approved: 'posted',
  cancelled: 'cancelled',
};

function emptyForm(seasons: SeasonDto[]): PaymentForm {
  const current = seasons.find((s) => s.is_current) ?? seasons[0];
  return {
    supplier: '',
    season: current?.id ?? '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    notes: '',
    paper_cheque_number: '',
    paper_bank_account: '',
    paper_due_date: '',
  };
}

function enrichRow(row: SupplierPaymentDto, seasons: SeasonDto[]): SupplierPaymentDto {
  const seasonName =
    row.season_name ??
    seasons.find((s) => s.id === row.season)?.name_ar ??
    null;
  return { ...row, season_name: seasonName };
}

function creditAccountForMethod(method: SupplierPaymentMethod, t: (key: string) => string): string {
  const map: Record<string, string> = {
    cash: t('suppliers.creditCash'),
    bank_account: t('suppliers.creditBankAccount'),
    wallet: t('suppliers.creditWallet'),
    cheque: t('suppliers.creditCheque'),
    promissory_note: t('suppliers.creditPromissory'),
    other_papers: t('suppliers.creditOtherPapers'),
    bank: t('suppliers.creditBankAccount'),
  };
  return map[method] ?? '—';
}

type AccountingPreviewProps = {
  form: PaymentForm;
  suppliers: Array<{ id: string; name_ar: string }>;
  seasons: SeasonDto[];
  t: (key: string) => string;
  methodLabel: (method: string) => string;
};

function SupplierPaymentAccountingPreview({
  form,
  suppliers,
  seasons,
  t,
  methodLabel,
}: AccountingPreviewProps) {
  const supplierName = suppliers.find((s) => s.id === form.supplier)?.name_ar;
  const seasonName = seasons.find((s) => s.id === form.season)?.name_ar;
  const amount = parseMoneyAmount(form.amount);
  const isReady = Boolean(form.supplier && form.season && amount > 0);
  const creditAccount = creditAccountForMethod(form.payment_method, t);
  const debitLabel = supplierName
    ? `${t('suppliers.accountingDebitSupplier')} — ${supplierName}`
    : t('suppliers.accountingDebitSupplier');

  const impacts = [
    { key: 'statement', label: t('suppliers.accountingImpactStatement'), active: Boolean(form.supplier) },
    { key: 'card', label: t('suppliers.accountingImpactCard'), active: Boolean(form.supplier && form.season) },
    { key: 'method', label: t('suppliers.accountingImpactMethod'), active: Boolean(form.payment_method) },
    {
      key: 'balances',
      label: t('suppliers.accountingImpactBalances'),
      active: ['cash', 'bank_account', 'wallet', 'bank'].includes(form.payment_method),
    },
  ];

  return (
    <div className="supplier-payment-accounting-preview rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
        <ArrowRightLeft className="h-4 w-4 text-blue-600 shrink-0" />
        {t('suppliers.accountingPreviewTitle')}
      </div>

      {!isReady ? (
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">{t('suppliers.accountingCompleteFormHint')}</p>
      ) : (
        <div className="mt-3 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('purchases.supplier')}</p>
              <p className="mt-0.5 font-semibold text-slate-800">{supplierName}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('suppliers.season')}</p>
              <p className="mt-0.5 font-semibold text-slate-800">{seasonName}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('suppliers.paidAmount')}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-700">{fmtMoney(amount)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('suppliers.paymentMethod')}</p>
              <p className="mt-0.5 font-semibold text-slate-800">{methodLabel(form.payment_method)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/40 overflow-hidden">
            <p className="px-3 py-2 text-xs font-bold text-blue-900 border-b border-blue-100/80">
              {t('suppliers.accountingEffects')}
            </p>
            <table className="erp-table-font w-full text-sm">
              <thead>
                <tr className="border-b border-blue-100/80 text-xs text-slate-500">
                  <th className="px-3 py-2 text-start font-bold">{t('suppliers.accountingDebitSupplier')}</th>
                  <th className="px-3 py-2 text-end font-bold tabular-nums w-28">{t('suppliers.paidAmount')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-blue-50">
                  <td className="px-3 py-2.5 text-slate-800">{debitLabel}</td>
                  <td className="px-3 py-2.5 text-end font-bold tabular-nums text-emerald-700">{fmtMoney(amount)}</td>
                </tr>
              </tbody>
              <thead>
                <tr className="border-b border-blue-100/80 text-xs text-slate-500">
                  <th className="px-3 py-2 text-start font-bold">{t('suppliers.accountingCreditSource')}</th>
                  <th className="px-3 py-2 text-end font-bold tabular-nums w-28">{t('suppliers.paidAmount')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2.5 text-slate-800">{creditAccount}</td>
                  <td className="px-3 py-2.5 text-end font-bold tabular-nums text-rose-700">{fmtMoney(amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            {impacts.map((impact) => (
              <span
                key={impact.key}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
                  impact.active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-50 text-slate-400',
                )}
              >
                <Check className={cn('h-3 w-3', impact.active ? 'text-emerald-600' : 'text-slate-300')} />
                {impact.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">{t('suppliers.accountingWillPostOnApprove')}</p>
    </div>
  );
}

export function SupplierPaymentsPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<SupplierPaymentDto[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SupplierPaymentDto | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm([]));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date_desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const paperSectionRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payments, supplierList, seasonList, accounts] = await Promise.all([
        fetchSupplierPayments(),
        fetchSuppliers(),
        fetchSeasons(),
        bankAccountsApi.list(),
      ]);
      setSeasons(seasonList);
      setSuppliers(supplierList);
      setBankAccounts(accounts);
      setRows(payments.map((p) => enrichRow(p, seasonList)));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('suppliers.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    const pending = consumeOpenDocument();
    if (!pending?.sourceId || pending.tab !== 'supplier-payments') return;
    const match = rows.find(
      (r) => r.id === pending.sourceId || r.code === pending.sourceCode,
    );
    if (match) setPreview(match);
  }, [loading, rows]);

  const methodOptions = useMemo(
    () => [
      { id: 'cash', title: t('pos.payCash'), description: t('suppliers.accountingEffectCashBank') },
      { id: 'bank_account', title: t('suppliers.payBankAccount'), description: t('suppliers.accountingEffectCashBank') },
      { id: 'wallet', title: t('pos.payWallet'), description: t('suppliers.accountingEffectPaymentMethod') },
      { id: 'cheque', title: t('suppliers.payCheque'), description: t('suppliers.accountingEffectPaymentMethod') },
      { id: 'promissory_note', title: t('suppliers.payPromissoryNote'), description: t('suppliers.payOtherPapers') },
      { id: 'other_papers', title: t('suppliers.payOtherPapers'), description: t('suppliers.accountingEffectPaymentMethod') },
    ],
    [t],
  );

  const methodLabel = (method: string) => {
    const map: Record<string, string> = {
      cash: t('pos.payCash'),
      bank: t('suppliers.payBank'),
      bank_account: t('suppliers.payBankAccount'),
      wallet: t('pos.payWallet'),
      cheque: t('suppliers.payCheque'),
      promissory_note: t('suppliers.payPromissoryNote'),
      other_papers: t('suppliers.payOtherPapers'),
    };
    return map[method] ?? method;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      draft: t('inventory.statusDraft'),
      approved: t('inventory.statusApproved'),
      cancelled: t('inventory.statusCancelled'),
    };
    return map[s] ?? s;
  };

  const voucherLabels: PaymentVoucherLabels = useMemo(
    () => ({
      title: t('suppliers.paymentVoucherTitle'),
      voucherNo: t('inventory.code'),
      date: t('purchases.date'),
      supplier: t('purchases.supplier'),
      amount: t('suppliers.paidAmount'),
      method: t('suppliers.paymentMethod'),
      reason: t('suppliers.paymentReason'),
      status: t('inventory.status'),
      approved: t('suppliers.approvedAt'),
      company: t('suppliers.voucherCompany'),
      footer: t('suppliers.voucherFooter'),
    }),
    [t],
  );

  const drawerStep = useMemo(() => {
    if (!form.supplier) return 0;
    if (!form.season) return 1;
    if (!form.amount || Number(form.amount) <= 0) return 2;
    return 3;
  }, [form]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (methodFilter && r.payment_method !== methodFilter) return false;
      if (supplierFilter && r.supplier !== supplierFilter) return false;
      if (seasonFilter && r.season !== seasonFilter) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.supplier_name.toLowerCase().includes(q) ||
        (r.season_name ?? '').toLowerCase().includes(q) ||
        (r.created_by_name ?? '').toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortKey === 'supplier') {
        return a.supplier_name.localeCompare(b.supplier_name, locale === 'ar' ? 'ar' : 'en');
      }
      if (sortKey === 'amount_desc') return Number(b.amount) - Number(a.amount);
      if (sortKey === 'amount_asc') return Number(a.amount) - Number(b.amount);
      if (sortKey === 'date_asc') return a.payment_date.localeCompare(b.payment_date);
      return b.payment_date.localeCompare(a.payment_date);
    });

    return list;
  }, [rows, search, statusFilter, methodFilter, supplierFilter, seasonFilter, sortKey, locale]);

  const stats = useMemo(() => {
    const approved = rows.filter((r) => r.status === 'approved');
    const draft = rows.filter((r) => r.status === 'draft');
    const approvedSum = approved.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    return {
      total: rows.length,
      approvedSum,
      draftCount: draft.length,
    };
  }, [rows]);

  const printPayment = (payment: SupplierPaymentDto) => {
    printSupplierPaymentVoucher(
      payment,
      voucherLabels,
      methodLabel(payment.payment_method),
      statusLabel(payment.status),
      locale,
    );
  };

  const openNew = () => {
    setForm({
      ...emptyForm(seasons),
      supplier: suppliers[0]?.id ?? '',
    });
    setError(null);
    setOpen(true);
  };

  const validateForm = (approve = false) => {
    if (!form.supplier || !form.season || !form.amount.trim()) {
      setError(t('suppliers.paymentFormRequired'));
      return false;
    }
    if (!isPositiveMoneyAmount(form.amount)) {
      setError(t('suppliers.paymentFormRequired'));
      return false;
    }
    if (approve && isPaperPaymentMethod(form.payment_method)) {
      if (!form.paper_cheque_number.trim() || !form.paper_bank_account || !form.paper_due_date) {
        setError(t('paymentCheques.paperFieldsRequired'));
        return false;
      }
    }
    return true;
  };

  const onSave = async (approve: boolean) => {
    if (!validateForm(approve)) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createSupplierPayment({
        supplier: form.supplier,
        amount: toApiMoneyAmount(form.amount),
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        notes: form.notes.trim() || `دفعة ${seasons.find((s) => s.id === form.season)?.name_ar ?? ''}`,
        paper_cheque_number: isPaperPaymentMethod(form.payment_method)
          ? form.paper_cheque_number.trim()
          : undefined,
        paper_bank_account: isPaperPaymentMethod(form.payment_method)
          ? form.paper_bank_account
          : undefined,
        paper_due_date: isPaperPaymentMethod(form.payment_method) ? form.paper_due_date : undefined,
        approve,
      });
      const enriched = enrichRow(
        {
          ...created,
          created_by_name: created.created_by_name ?? user?.full_name ?? user?.username ?? '—',
          season_name:
            created.season_name ??
            seasons.find((s) => s.id === (created.season ?? form.season))?.name_ar ??
            null,
        },
        seasons,
      );
      setOpen(false);
      setRows((prev) => [enriched, ...prev.filter((r) => r.id !== enriched.id)]);
      if (approve) {
        printPayment(enriched);
        if (enriched.payment_paper_id) {
          showPremiumToast({
            tone: 'success',
            title: t('paymentCheques.linkedFromSupplier'),
            description: t('paymentCheques.openTrackingHint'),
          });
          navigateToPaymentCheques({ highlight: enriched.payment_paper_id });
        }
      }
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('suppliers.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const previewDraft = useMemo((): SupplierPaymentDto | null => {
    if (!form.supplier || !form.amount) return null;
    return {
      id: '',
      code: '—',
      supplier: form.supplier,
      supplier_name: suppliers.find((s) => s.id === form.supplier)?.name_ar ?? '—',
      amount: form.amount,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      status: 'draft',
      notes: form.notes || '—',
      season: form.season,
      season_name: seasons.find((s) => s.id === form.season)?.name_ar ?? '—',
      created_by_name: user?.full_name ?? user?.username ?? '—',
      created_at: new Date().toISOString(),
      approved_at: null,
    };
  }, [form, suppliers, seasons, user]);

  const statusQuickFilters = useMemo(
    () => [
      { value: '', label: t('suppliers.filterAllStatuses') },
      { value: 'draft', label: t('inventory.statusDraft') },
      { value: 'approved', label: t('inventory.statusApproved') },
      { value: 'cancelled', label: t('inventory.statusCancelled') },
    ],
    [t],
  );

  const advancedFilterCount = [methodFilter, supplierFilter, seasonFilter].filter(Boolean).length;
  const hasActiveFilters =
    Boolean(search.trim()) || Boolean(statusFilter) || advancedFilterCount > 0 || sortKey !== 'date_desc';

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('');
    setMethodFilter('');
    setSupplierFilter('');
    setSeasonFilter('');
    setSortKey('date_desc');
  };

  const filterSelectClass =
    'erp-native-select erp-smart-filter-select w-full rounded-xl border border-slate-200 bg-white ps-3 !pe-10 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
    if (methodFilter) {
      chips.push({
        key: 'method',
        label: `${t('suppliers.settlementType')}: ${methodLabel(methodFilter)}`,
        onClear: () => setMethodFilter(''),
      });
    }
    if (supplierFilter) {
      chips.push({
        key: 'supplier',
        label: `${t('purchases.supplier')}: ${suppliers.find((s) => s.id === supplierFilter)?.name_ar ?? '—'}`,
        onClear: () => setSupplierFilter(''),
      });
    }
    if (seasonFilter) {
      chips.push({
        key: 'season',
        label: `${t('suppliers.season')}: ${seasons.find((s) => s.id === seasonFilter)?.name_ar ?? '—'}`,
        onClear: () => setSeasonFilter(''),
      });
    }
    if (sortKey !== 'date_desc') {
      const sortLabels: Record<SortKey, string> = {
        date_desc: t('suppliers.sortDateDesc'),
        date_asc: t('suppliers.sortDateAsc'),
        amount_desc: t('suppliers.sortAmountDesc'),
        amount_asc: t('suppliers.sortAmountAsc'),
        supplier: t('purchases.supplier'),
      };
      chips.push({
        key: 'sort',
        label: `${t('suppliers.sortBy')}: ${sortLabels[sortKey]}`,
        onClear: () => setSortKey('date_desc'),
      });
    }
    return chips;
  }, [methodFilter, supplierFilter, seasonFilter, sortKey, suppliers, seasons, t]);

  return (
    <ErpCrudPage
      title={t('nav.supplierPayments')}
      description={t('suppliers.paymentsPageDesc')}
      breadcrumbs={[
        { label: t('nav.erp') },
        { label: t('nav.supplierPayments') },
      ]}
      actions={
        <PageToolbar onRefresh={load}>
          <ErpAddButton onClick={openNew} disabled={!suppliers.length}>
            {t('suppliers.addNewPayment')}
          </ErpAddButton>
        </PageToolbar>
      }
      stats={
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('suppliers.totalVouchers')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('suppliers.approvedTotal')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{fmtMoney(stats.approvedSum)}</p>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('suppliers.draftVouchers')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">{stats.draftCount}</p>
          </div>
        </div>
      }
    >
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <AlertBanner variant="info">
        <FileCheck className="inline h-4 w-4 me-1" />
        {t('paymentCheques.supplierFlowHint')}{' '}
        <button
          type="button"
          className="font-bold underline underline-offset-2 ms-1"
          onClick={() => navigateToPaymentCheques()}
        >
          {t('nav.paymentCheques')}
        </button>
      </AlertBanner>

      <div className="erp-smart-filter-bar rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100/80">
          <div className="relative flex-1 min-w-[min(100%,280px)]">
            <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 start-3 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('suppliers.searchPayments')}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1">
            {statusQuickFilters.map((item) => (
              <button
                key={item.value || 'all'}
                type="button"
                onClick={() => setStatusFilter(item.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap',
                  statusFilter === item.value
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            size="sm"
            variant={filtersOpen || advancedFilterCount > 0 ? 'default' : 'outline'}
            className="h-10 rounded-xl gap-1.5"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{t('suppliers.smartFilters')}</span>
            {advancedFilterCount > 0 ? (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                {advancedFilterCount}
              </span>
            ) : null}
          </Button>

          <div className="relative">
            <ArrowUpDown className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 start-2.5 pointer-events-none" />
            <select
              className={cn(filterSelectClass, 'min-w-[10.5rem] !ps-8 !text-xs')}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label={t('suppliers.sortBy')}
            >
              <option value="date_desc">{t('suppliers.sortDateDesc')}</option>
              <option value="date_asc">{t('suppliers.sortDateAsc')}</option>
              <option value="amount_desc">{t('suppliers.sortAmountDesc')}</option>
              <option value="amount_asc">{t('suppliers.sortAmountAsc')}</option>
              <option value="supplier">{t('purchases.supplier')}</option>
            </select>
          </div>

          <span className="ms-auto inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 tabular-nums">
            {t('suppliers.showingResults').replace('{shown}', String(filtered.length)).replace('{total}', String(rows.length))}
          </span>
        </div>

        {filtersOpen ? (
          <div className="grid gap-3 p-3 sm:grid-cols-3 bg-slate-50/50 border-b border-slate-100/80">
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('suppliers.settlementType')}</span>
              <select className={filterSelectClass} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                <option value="">{t('suppliers.filterAllMethods')}</option>
                <option value="cash">{t('pos.payCash')}</option>
                <option value="bank_account">{t('suppliers.payBankAccount')}</option>
                <option value="wallet">{t('pos.payWallet')}</option>
                <option value="cheque">{t('suppliers.payCheque')}</option>
                <option value="promissory_note">{t('suppliers.payPromissoryNote')}</option>
                <option value="other_papers">{t('suppliers.payOtherPapers')}</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('purchases.supplier')}</span>
              <select className={filterSelectClass} value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                <option value="">{t('suppliers.filterAllSuppliers')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('suppliers.season')}</span>
              <select className={filterSelectClass} value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
                <option value="">{t('suppliers.filterAllSeasons')}</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {activeChips.length > 0 || hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white/80">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClear}
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100"
              >
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
              >
                {t('suppliers.clearAllFilters')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="py-16 text-center text-slate-500">{t('inventory.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-slate-50 py-16 text-center">
          <Wallet className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">{t('suppliers.gridEmpty')}</p>
          <ErpAddButton className="mt-4" onClick={openNew} disabled={!suppliers.length}>
            {t('suppliers.addNewPayment')}
          </ErpAddButton>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <article
              key={row.id}
              className={cn(
                'group rounded-2xl border bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm transition-all hover:shadow-lg hover:border-blue-200',
                row.status === 'approved' && 'ring-1 ring-emerald-100',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-slate-500">{row.code}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{fmtMoney(row.amount)}</p>
                </div>
                <StatusBadge status={STATUS_MAP[row.status] ?? 'draft'} label={statusLabel(row.status)} />
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <User className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="truncate">{row.supplier_name}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    {METHOD_ICONS[row.payment_method] ?? <Wallet className="h-3.5 w-3.5" />}
                    <strong>{t('suppliers.settlementType')}:</strong> {methodLabel(row.payment_method)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <strong>{t('suppliers.season')}:</strong> {row.season_name || '—'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {row.payment_date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <strong>{t('suppliers.createdBy')}:</strong> {row.created_by_name || '—'}
                  </span>
                </div>
                {row.notes ? (
                  <p className="text-xs text-slate-500 line-clamp-2" title={row.notes}>
                    {row.notes}
                  </p>
                ) : null}
                {isPaperPaymentMethod(row.payment_method) && row.payment_paper_id ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-2.5 py-1.5 text-xs text-blue-900">
                    <strong>{t('paymentCheques.colPaper')}:</strong>{' '}
                    {row.payment_paper_number || row.paper_cheque_number || '—'}
                    {row.payment_paper_status ? (
                      <span className="ms-2 font-bold">({t(`paymentCheques.status.${row.payment_paper_status}` as 'paymentCheques.status.pending')})</span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-1 border-t pt-3">
                <Button type="button" size="sm" variant="ghost" title={t('suppliers.previewVoucher')} onClick={() => setPreview(row)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="sm" variant="ghost" title={t('inventory.print')} onClick={() => printPayment(row)}>
                  <Printer className="h-3.5 w-3.5" />
                </Button>
                {row.payment_paper_id ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title={t('paymentCheques.openTracking')}
                    onClick={() => navigateToPaymentCheques({ highlight: row.payment_paper_id! })}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                ) : null}
                {row.status === 'draft' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title={t('inventory.saveAndApprove')}
                    onClick={async () => {
                      setError(null);
                      try {
                        const approved = await approveSupplierPayment(row.id);
                        await load();
                        if (approved.payment_paper_id) {
                          navigateToPaymentCheques({ highlight: approved.payment_paper_id });
                        }
                      } catch (e) {
                        setError(e instanceof ApiRequestError ? e.message : t('suppliers.saveFailed'));
                      }
                    }}
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ErpSideDrawer
        open={open}
        onOpenChange={setOpen}
        title={t('suppliers.paymentCanvasTitle')}
        description={t('suppliers.paymentCanvasDesc')}
        width="wide"
        saveLabel={t('suppliers.saveAndPrint')}
        cancelLabel={t('inventory.cancel')}
        disabled={saving}
        onSave={() => onSave(true)}
        steps={[t('purchases.supplier'), t('suppliers.season'), t('suppliers.settlementType'), t('suppliers.accountingEffects')]}
        currentStep={form.supplier && form.season && form.amount ? 2 : form.supplier ? 1 : 0}
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">{t('purchases.supplier')} *</span>
              <select
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              >
                <option value="">{t('suppliers.selectSupplier')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">{t('suppliers.season')} *</span>
              <select
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
              >
                <option value="">{t('suppliers.selectSeason')}</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                    {s.is_current ? ` (${t('inventory.seasonCurrent')})` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section className="space-y-3">
            <span className="text-sm font-bold text-slate-700">{t('suppliers.paymentMethod')} *</span>
            <select
              className="w-full rounded-xl border px-3 py-2.5 text-sm font-semibold bg-white"
              value={form.payment_method}
              onChange={(e) => {
                const method = e.target.value as SupplierPaymentMethod;
                setForm((f) => ({
                  ...f,
                  payment_method: method,
                  paper_bank_account: f.paper_bank_account || bankAccounts[0]?.id || '',
                  paper_due_date: f.paper_due_date || f.payment_date,
                }));
              }}
            >
              {methodOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.title}
                </option>
              ))}
            </select>
            <OptionCardGrid
              columns={3}
              options={methodOptions}
              value={form.payment_method}
              onChange={(id) => {
                const method = id as SupplierPaymentMethod;
                setForm((f) => ({
                  ...f,
                  payment_method: method,
                  paper_bank_account: f.paper_bank_account || bankAccounts[0]?.id || '',
                  paper_due_date: f.paper_due_date || f.payment_date,
                }));
              }}
            />
          </section>

          <section
            ref={paperSectionRef}
            className={cn(
              'rounded-2xl border-2 p-4 space-y-3 shadow-sm',
              isPaperPaymentMethod(form.payment_method)
                ? 'border-blue-400 bg-gradient-to-br from-blue-100/80 to-white ring-2 ring-blue-200'
                : 'border-dashed border-slate-300 bg-slate-50/80',
            )}
          >
            <div className="flex items-start gap-2">
              <FileCheck className={cn('h-5 w-5 shrink-0 mt-0.5', isPaperPaymentMethod(form.payment_method) ? 'text-blue-700' : 'text-slate-400')} />
              <div>
                <p className="text-sm font-bold text-slate-900">{t('paymentCheques.paperSectionTitle')}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isPaperPaymentMethod(form.payment_method)
                    ? t('paymentCheques.paperSectionDesc')
                    : t('paymentCheques.selectPaperMethodHint')}
                </p>
              </div>
            </div>

            {!isPaperPaymentMethod(form.payment_method) ? (
              <p className="text-center text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3">
                {t('paymentCheques.tapChequeToUnlock')}
              </p>
            ) : null}

            {!bankAccounts.length && isPaperPaymentMethod(form.payment_method) ? (
              <AlertBanner variant="warning">{t('paymentCheques.noBankAccountsHint')}</AlertBanner>
            ) : null}

            <div
              className={cn(
                'grid gap-3 md:grid-cols-2',
                !isPaperPaymentMethod(form.payment_method) && 'opacity-45 pointer-events-none select-none',
              )}
            >
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-sm font-bold">{t('banking.chequeNumber')} *</span>
                <Input
                  value={form.paper_cheque_number}
                  onChange={(e) => setForm({ ...form, paper_cheque_number: e.target.value })}
                  placeholder="1234567"
                  disabled={!isPaperPaymentMethod(form.payment_method)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-bold">{t('banking.account')} *</span>
                <select
                  className="w-full rounded-xl border px-3 py-2.5 text-sm"
                  value={form.paper_bank_account}
                  onChange={(e) => setForm({ ...form, paper_bank_account: e.target.value })}
                  disabled={!isPaperPaymentMethod(form.payment_method)}
                >
                  <option value="">{t('paymentCheques.selectBankAccount')}</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name_ar} — {a.bank_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-bold">{t('banking.dueDate')} *</span>
                <Input
                  type="date"
                  value={form.paper_due_date}
                  onChange={(e) => setForm({ ...form, paper_due_date: e.target.value })}
                  disabled={!isPaperPaymentMethod(form.payment_method)}
                />
              </label>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">{t('purchases.date')} *</span>
              <Input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              />
            </label>
            <label className="block space-y-1.5 md:col-span-2">
              <span className="text-sm font-bold text-slate-700">{t('suppliers.paidAmount')} *</span>
              <MoneyAmountInput
                className="text-2xl font-extrabold tabular-nums text-end h-14 bg-gradient-to-l from-emerald-50/80 to-white border-emerald-200/70"
                placeholder="50000"
                value={form.amount}
                onChange={(amount) => setForm({ ...form, amount })}
              />
              {isPositiveMoneyAmount(form.amount) ? (
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-slate-50 px-4 py-3">
                  <PaymentAmountHero
                    amount={form.amount}
                    locale={locale}
                    size="md"
                    currencyLabel={locale === 'ar' ? 'جنيه مصري' : 'EGP'}
                  />
                </div>
              ) : null}
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-700">{t('suppliers.notesOptional')}</span>
            <textarea
              className="w-full min-h-[80px] rounded-xl border px-3 py-2 text-sm"
              placeholder={t('suppliers.paymentReasonPlaceholder')}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          <SupplierPaymentAccountingPreview
            form={form}
            suppliers={suppliers}
            seasons={seasons}
            t={t}
            methodLabel={methodLabel}
          />

          {previewDraft && isPaperPaymentMethod(form.payment_method) ? (
            <details className="rounded-xl border bg-slate-50 p-3">
              <summary className="text-sm font-bold cursor-pointer">{t('suppliers.previewVoucher')}</summary>
              <div className="mt-3">
                <SupplierPaymentVoucherPreview
                  payment={previewDraft}
                  labels={voucherLabels}
                  methodLabel={methodLabel(previewDraft.payment_method)}
                  statusLabel={statusLabel('draft')}
                  locale={locale}
                />
              </div>
            </details>
          ) : null}
        </div>
      </ErpSideDrawer>

      <Sheet open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('suppliers.previewVoucher')}</SheetTitle>
          </SheetHeader>
          {preview ? (
            <div className="py-4 space-y-4">
              <SupplierPaymentVoucherPreview
                payment={preview}
                labels={voucherLabels}
                methodLabel={methodLabel(preview.payment_method)}
                statusLabel={statusLabel(preview.status)}
                locale={locale}
              />
              <Button type="button" className="w-full" onClick={() => printPayment(preview)}>
                <Printer className="h-4 w-4 me-2" />
                {t('inventory.print')}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </ErpCrudPage>
  );
}
