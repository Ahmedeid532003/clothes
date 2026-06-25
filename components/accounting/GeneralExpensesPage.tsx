import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  FileText,
  FolderTree,
  Plus,
  Receipt,
  Search,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  expenseTypesApi,
  expenseVouchersApi,
  glAccountsApi,
  treasuriesApi,
  type ExpenseTypeDto,
  type ExpenseVoucherDto,
} from '@/lib/api/accounting';
import { isLoggedIn } from '@/lib/api/auth';
import { ApiRequestError, isExpenseTypesNotMigratedError } from '@/lib/api/errors';
import { canViewPage } from '@/lib/permissions/access';
import { EXPENSE_ITEM_PRESETS } from '@/components/accounting/expensePresets';
import { GeneralExpenseItemsPanel } from '@/components/accounting/GeneralExpenseItemsPanel';
import { PaymentAmountHero } from '@/components/accounting/PaymentAmountHero';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import {
  AlertBanner,
  DataCard,
  DataTable,
  PageSectionHeader,
  PageToolbar,
  StatusBadge,
  TableHead,
  Th,
  fmtMoney,
} from '@/components/accounting/AccountingUi';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';
import { Button } from '@/components/ui/button';
import { MoneyAmountInput } from '@/components/ui/MoneyAmountInput';
import { showPremiumToast } from '@/components/ui/premium-toast';
import { isPositiveMoneyAmount, toApiMoneyAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

type PageView = 'expenses' | 'items';

const emptyExpenseForm = () => ({
  expense_type: '',
  amount: '',
  notes: '',
  voucher_date: new Date().toISOString().slice(0, 10),
  treasury: '',
});

export function GeneralExpensesPage({
  initialView = 'records',
}: {
  initialView?: 'records' | 'items';
}) {
  const { t, locale, isRtl } = useLanguage();
  const { user } = useAuth();
  const canRecords = canViewPage(user, 'expense-vouchers');
  const canItems = canViewPage(user, 'expense-types');

  const [view, setView] = useState<PageView>(initialView === 'items' ? 'items' : 'expenses');
  const [loading, setLoading] = useState(true);
  const [migration, setMigration] = useState(false);
  const [rows, setRows] = useState<ExpenseVoucherDto[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeDto[]>([]);
  const [glAccounts, setGlAccounts] = useState<Array<{ id: string; label: string }>>([]);
  const [treasuries, setTreasuries] = useState<Array<{ id: string; name_ar: string; branch: string | null }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [saving, setSaving] = useState(false);
  const [openAddSignal, setOpenAddSignal] = useState(0);

  const resolveError = useCallback(
    (e: unknown) => {
      if (isExpenseTypesNotMigratedError(e)) {
        setMigration(true);
        return t('accounting.expenseTypesMigrationHint');
      }
      if (e instanceof ApiRequestError && e.status === 401) {
        return t('accounting.sessionExpiredHint');
      }
      return e instanceof Error ? e.message : 'Error';
    },
    [t],
  );

  const load = useCallback(async () => {
    if (!isLoggedIn() || !user || (!canRecords && !canItems)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setMigration(false);
    try {
      const types = canItems || canRecords ? await expenseTypesApi.list() : [];
      const [trList, vouchers, gl] = await Promise.all([
        canRecords ? treasuriesApi.list().catch(() => []) : Promise.resolve([]),
        canRecords ? expenseVouchersApi.list(statusFilter || undefined).catch(() => []) : Promise.resolve([]),
        canItems ? glAccountsApi.list().catch(() => []) : Promise.resolve([]),
      ]);

      setExpenseTypes(types.filter((x) => x.is_active));
      setRows(vouchers);
      setGlAccounts(
        gl
          .filter((a) => a.account_type === 'expense')
          .map((a) => ({ id: a.id, label: `${a.code} — ${a.name_ar}` })),
      );
      setTreasuries(
        trList.map((tr) => ({
          id: tr.id,
          name_ar: tr.name_ar,
          branch: tr.branch,
        })),
      );
    } catch (e) {
      setError(resolveError(e));
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, [canRecords, canItems, user, statusFilter, resolveError]);

  useEffect(() => {
    load();
  }, [load]);

  const readyTypes = useMemo(
    () => expenseTypes.filter((x) => x.gl_account),
    [expenseTypes],
  );

  const typesById = useMemo(
    () => Object.fromEntries(expenseTypes.map((et) => [et.id, et])),
    [expenseTypes],
  );

  const selectedType = expenseForm.expense_type ? typesById[expenseForm.expense_type] : null;
  const selectedTreasury = treasuries.find((tr) => tr.id === expenseForm.treasury) ?? treasuries[0] ?? null;

  const inferCategory = (row: ExpenseTypeDto) => {
    const preset = EXPENSE_ITEM_PRESETS.find(
      (p) => p.name_ar === row.name_ar || p.code_segment === row.code_segment,
    );
    if (preset?.category === 'administrative') return t('accounting.expenseCategoryAdministrative');
    if (preset?.category === 'operational') return t('accounting.expenseCategoryOperational');
    return t('accounting.expenseCategoryOther');
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!q) return true;
      return (
        row.code?.toLowerCase().includes(q) ||
        row.expense_type_name?.toLowerCase().includes(q) ||
        row.notes?.toLowerCase().includes(q) ||
        row.voucher_date?.includes(q)
      );
    });
  }, [rows, search]);

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      draft: t('accounting.voucherStatusDraft'),
      approved: t('accounting.voucherStatusApproved'),
      posted: t('accounting.voucherStatusPosted'),
      cancelled: t('accounting.voucherStatusCancelled'),
    };
    return m[s] ?? s;
  };

  const totalAmount = useMemo(
    () => rows.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + Number(r.total_amount || 0), 0),
    [rows],
  );

  const openAddExpense = () => {
    const first = readyTypes[0];
    setExpenseForm({
      ...emptyExpenseForm(),
      expense_type: first?.id ?? '',
      treasury: treasuries[0]?.id ?? '',
    });
    setExpenseOpen(true);
  };

  const openItemsView = (openAdd = false) => {
    setView('items');
    if (openAdd) setOpenAddSignal((n) => n + 1);
  };

  const canSaveExpense =
    !!selectedType?.gl_account &&
    !!selectedTreasury &&
    isPositiveMoneyAmount(expenseForm.amount);

  const saveExpense = async () => {
    if (!selectedType || !selectedTreasury || !isPositiveMoneyAmount(expenseForm.amount)) {
      setError(t('accounting.expenseFormRequired'));
      return;
    }
    const savedAmount = toApiMoneyAmount(expenseForm.amount);
    setSaving(true);
    setError(null);
    try {
      await expenseVouchersApi.create({
        voucher_date: expenseForm.voucher_date,
        expense_type: selectedType.id,
        amount: savedAmount,
        tax_amount: '0',
        payment_method: 'cash',
        treasury: selectedTreasury.id,
        branch: selectedType.branch || selectedTreasury.branch || null,
        cost_center: selectedType.cost_center || null,
        notes: expenseForm.notes.trim(),
        approve: true,
        post: true,
      });
      setExpenseOpen(false);
      await load();
      showPremiumToast({
        tone: 'success',
        title: t('accounting.expenseSavedSuccess'),
        description: `${selectedType.name_ar} — ${fmtMoney(savedAmount)}`,
      });
    } catch (e) {
      setError(resolveError(e));
    } finally {
      setSaving(false);
    }
  };

  if (!canRecords && !canItems) {
    return <AlertBanner variant="error">{t('accounting.noExpenseAccess')}</AlertBanner>;
  }

  if (view === 'items' && canItems) {
    return (
      <div className="general-expenses-shell space-y-4">
        <button
          type="button"
          onClick={() => setView('expenses')}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className={cn('h-4 w-4', isRtl ? '' : 'rotate-180')} />
          {t('accounting.backToExpenses')}
        </button>

        <PageSectionHeader
          icon={<FolderTree className="h-6 w-6" />}
          title={t('accounting.expenseItemsManageTitle')}
          description={t('accounting.expenseItemsManageDesc')}
        />

        {error ? <AlertBanner variant={migration ? 'warning' : 'error'}>{error}</AlertBanner> : null}
        {migration ? (
          <AlertBanner variant="warning">{t('accounting.expenseTypesMigrationHint')}</AlertBanner>
        ) : null}

        <GeneralExpenseItemsPanel
          onChanged={load}
          externalTypes={expenseTypes}
          externalGlAccounts={glAccounts}
          skipInitialLoad
          openAddSignal={openAddSignal}
        />
      </div>
    );
  }

  const filterSelectClass =
    'erp-native-select erp-smart-filter-select min-h-10 rounded-xl border border-slate-200 bg-white ps-3 !pe-10 text-sm';

  return (
    <div className="general-expenses-shell space-y-4">
      <PageSectionHeader
        icon={<Receipt className="h-6 w-6" />}
        title={t('nav.generalExpenses')}
        description={t('accounting.generalExpensesPageDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            {canItems ? (
              <Button type="button" variant="outline" size="sm" onClick={() => openItemsView(true)}>
                <Plus className="h-4 w-4 me-1" />
                {t('accounting.addExpenseItem')}
              </Button>
            ) : null}
            {canRecords ? (
              <Button type="button" size="sm" onClick={openAddExpense} disabled={!readyTypes.length || !treasuries.length}>
                <Plus className="h-4 w-4 me-1" />
                {t('accounting.addExpense')}
              </Button>
            ) : null}
          </PageToolbar>
        }
      />

      {error ? <AlertBanner variant={migration ? 'warning' : 'error'}>{error}</AlertBanner> : null}
      {migration ? (
        <AlertBanner variant="warning">{t('accounting.expenseTypesMigrationHint')}</AlertBanner>
      ) : null}

      {canRecords && !readyTypes.length ? (
        <AlertBanner variant="warning">
          {t('accounting.expenseNoReadyItems')}{' '}
          {canItems ? (
            <button
              type="button"
              className="font-bold text-amber-900 underline"
              onClick={() => openItemsView(true)}
            >
              {t('accounting.addExpenseItem')}
            </button>
          ) : null}
        </AlertBanner>
      ) : null}

      {canRecords && readyTypes.length > 0 && !treasuries.length ? (
        <AlertBanner variant="warning">{t('accounting.setupTreasuries')}</AlertBanner>
      ) : null}

      {canRecords ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiTile label={t('accounting.expenseRecordsCount')} value={String(rows.length)} />
            <KpiTile label={t('accounting.expenseTotalLabel')} value={fmtMoney(totalAmount)} accent />
            <KpiTile label={t('accounting.expenseItemsReady')} value={`${readyTypes.length} / ${expenseTypes.length}`} />
          </div>

          <div className="erp-smart-filter-bar rounded-2xl border border-slate-200/80 bg-white p-3 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 start-3" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('accounting.searchExpenses')}
                className="w-full h-10 rounded-xl border ps-9 pe-3 text-sm"
              />
            </div>
            <select
              className={filterSelectClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t('accounting.allStatuses')}</option>
              <option value="draft">{t('accounting.voucherStatusDraft')}</option>
              <option value="approved">{t('accounting.voucherStatusApproved')}</option>
              <option value="posted">{t('accounting.voucherStatusPosted')}</option>
            </select>
            {canItems ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => openItemsView(false)}>
                <FolderTree className="h-4 w-4 me-1" />
                {t('accounting.manageExpenseItems')}
              </Button>
            ) : null}
          </div>

          <DataCard>
            {loading ? (
              <p className="py-16 text-center text-slate-500">{t('inventory.loading')}</p>
            ) : filteredRows.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">{t('accounting.expensesEmpty')}</p>
                {readyTypes.length > 0 ? (
                  <Button type="button" size="sm" className="mt-4" onClick={openAddExpense}>
                    <Plus className="h-4 w-4 me-1" />
                    {t('accounting.addExpense')}
                  </Button>
                ) : null}
              </div>
            ) : (
              <DataTable minWidth="880px">
                <TableHead>
                  <Th>{t('accounting.colCode')}</Th>
                  <Th>{t('accounting.voucherDate')}</Th>
                  <Th>{t('accounting.expenseItem')}</Th>
                  <Th align="end">{t('accounting.amount')}</Th>
                  <Th>{t('accounting.filterStatus')}</Th>
                  <Th>{t('inventory.notes')}</Th>
                </TableHead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-mono text-xs text-blue-700">{row.code}</td>
                      <td className="px-3 py-2.5 text-slate-600">{row.voucher_date}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{row.expense_type_name}</td>
                      <td className="px-3 py-2.5 text-end font-bold tabular-nums text-emerald-700">
                        {fmtMoney(row.total_amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={row.status} label={statusLabel(row.status)} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[200px] truncate" title={row.notes}>
                        {row.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </DataCard>
        </>
      ) : null}

      <ErpSideDrawer
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        title={t('accounting.addNewExpense')}
        description={t('accounting.addExpenseDrawerDesc')}
        saveLabel={t('accounting.saveExpense')}
        cancelLabel={t('inventory.cancel')}
        disabled={saving || !canSaveExpense}
        onSave={saveExpense}
        steps={[
          t('accounting.expenseItem'),
          t('accounting.amount'),
          t('accounting.voucherDate'),
        ]}
        currentStep={
          !expenseForm.expense_type ? 0 : !isPositiveMoneyAmount(expenseForm.amount) ? 1 : 2
        }
      >
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-800">{t('accounting.expenseItem')} *</span>
            <select
              className={filterSelectClass}
              value={expenseForm.expense_type}
              onChange={(e) => setExpenseForm((f) => ({ ...f, expense_type: e.target.value }))}
            >
              <option value="">{t('accounting.selectExpenseItem')}</option>
              {readyTypes.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.name_ar} — {et.code}
                </option>
              ))}
            </select>
          </label>

          {selectedType ? (
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700/80">
                {t('accounting.expenseItemDetails')}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <DetailRow label={t('accounting.expenseItemName')} value={selectedType.name_ar} />
                <DetailRow label={t('accounting.colCode')} value={selectedType.code} mono />
                <DetailRow label={t('accounting.expenseCategory')} value={inferCategory(selectedType)} />
                <DetailRow
                  label={t('accounting.colGl')}
                  value={
                    selectedType.gl_account_code
                      ? `${selectedType.gl_account_code} — ${selectedType.gl_account_name ?? ''}`
                      : t('accounting.glNotLinked')
                  }
                  warn={!selectedType.gl_account}
                />
                {selectedType.cost_center_name ? (
                  <DetailRow label={t('accounting.costCenter')} value={selectedType.cost_center_name} />
                ) : null}
              </div>
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-800">{t('accounting.amount')} *</span>
            <MoneyAmountInput
              className="text-2xl font-extrabold tabular-nums text-end h-12"
              placeholder="0"
              value={expenseForm.amount}
              onChange={(v) => setExpenseForm((f) => ({ ...f, amount: v }))}
            />
            {isPositiveMoneyAmount(expenseForm.amount) ? (
              <PaymentAmountHero
                amount={expenseForm.amount}
                locale={locale}
                size="sm"
                currencyLabel={locale === 'ar' ? 'جنيه' : 'EGP'}
              />
            ) : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-800">{t('accounting.voucherDate')} *</span>
            <input
              type="date"
              className="w-full h-10 rounded-xl border px-3 text-sm"
              value={expenseForm.voucher_date}
              onChange={(e) => setExpenseForm((f) => ({ ...f, voucher_date: e.target.value }))}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">{t('inventory.notes')}</span>
            <textarea
              className="w-full min-h-[80px] rounded-xl border px-3 py-2 text-sm"
              placeholder={t('accounting.expenseNotesShort')}
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>

          {treasuries.length > 1 ? (
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">{t('accounting.treasury')}</span>
              <select
                className={filterSelectClass}
                value={expenseForm.treasury}
                onChange={(e) => setExpenseForm((f) => ({ ...f, treasury: e.target.value }))}
              >
                {treasuries.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.name_ar}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <p className="text-xs text-slate-500 rounded-xl bg-slate-50 px-3 py-2">
            {t('accounting.expenseAutoPostHint')}
          </p>
        </div>
      </ErpSideDrawer>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          'font-semibold text-slate-900',
          mono && 'font-mono text-xs',
          warn && 'text-amber-700',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function KpiTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn('text-xl font-bold tabular-nums mt-0.5', accent ? 'text-emerald-700' : 'text-slate-900')}>
        {value}
      </p>
    </div>
  );
}
