import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  Plus,
  RotateCcw,
  Search,
  Truck,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  bankAccountsApi,
  chequesApi,
  type BankAccountDto,
  type ChequeDto,
  type ChequePaperType,
  type ChequePayPayload,
  type ChequeStatus,
} from '@/lib/api/banking';
import { canViewPage } from '@/lib/permissions/access';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import { PaymentAmountHero } from '@/components/accounting/PaymentAmountHero';
import {
  AlertBanner,
  appNavigate,
  DataCard,
  DataTable,
  PageSectionHeader,
  PageToolbar,
  StatusBadge,
  TableHead,
  Th,
  fmtMoney,
} from '@/components/accounting/AccountingUi';
import { consumePaymentChequesNavMeta } from '@/lib/payment-papers';
import { Button } from '@/components/ui/button';
import { MoneyAmountInput } from '@/components/ui/MoneyAmountInput';
import { showPremiumToast } from '@/components/ui/premium-toast';
import { isPositiveMoneyAmount, toApiMoneyAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

const PAPER_TYPES: ChequePaperType[] = ['cheque', 'promissory_note', 'bill_of_exchange', 'other_paper'];
const STATUS_FILTERS: Array<ChequeStatus | ''> = ['', 'pending', 'delivered', 'paid', 'cancelled', 'returned'];

const emptyPaperForm = (accountId = '') => ({
  paper_type: 'cheque' as ChequePaperType,
  direction: 'payable' as 'payable' | 'receivable',
  cheque_number: '',
  bank_account: accountId,
  amount: '',
  due_date: '',
  delivery_date: '',
  party_name: '',
  notes: '',
});

const emptyPayForm = (row: ChequeDto) => ({
  pay_source: 'bank' as 'cash' | 'bank',
  amount: row.amount,
  pay_date: new Date().toISOString().slice(0, 10),
  pay_bank_account: row.bank_account,
  pay_notes: '',
});

export function PaymentChequesTrackingPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const canView = canViewPage(user, 'payment-cheques') || canViewPage(user, 'cheques');

  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [rows, setRows] = useState<ChequeDto[]>([]);
  const [alerts, setAlerts] = useState<ChequeDto[]>([]);
  const [paperFilter, setPaperFilter] = useState<ChequePaperType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ChequeStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<'' | 'supplier' | 'manual'>('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paperOpen, setPaperOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<ChequeDto | null>(null);
  const [paperForm, setPaperForm] = useState(emptyPaperForm());
  const [payForm, setPayForm] = useState(emptyPayForm({ amount: '0' } as ChequeDto));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string; paper_type?: string; source?: string } = {};
      if (statusFilter) params.status = statusFilter;
      if (paperFilter) params.paper_type = paperFilter;
      if (sourceFilter) params.source = sourceFilter;
      const [acc, list, al] = await Promise.all([
        bankAccountsApi.list(),
        chequesApi.list(Object.keys(params).length ? params : undefined),
        chequesApi.alerts(3),
      ]);
      setAccounts(acc);
      setRows(list);
      setAlerts(al);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('banking.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [canView, statusFilter, paperFilter, sourceFilter, t]);

  useEffect(() => {
    const meta = consumePaymentChequesNavMeta();
    if (meta?.highlight) setHighlightId(meta.highlight);
    if (meta?.source) setSourceFilter(meta.source);
    if (meta?.status) setStatusFilter(meta.status as ChequeStatus);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const el = document.getElementById(`cheque-row-${highlightId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => setHighlightId(null), 6000);
    return () => window.clearTimeout(timer);
  }, [highlightId, loading, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.cheque_number.toLowerCase().includes(q) ||
        r.party_name.toLowerCase().includes(q) ||
        r.bank_name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const kpis = useMemo(() => {
    const active = rows.filter((r) => ['pending', 'delivered'].includes(r.status));
    return {
      active: active.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      dueSoon: alerts.length,
      totalDue: active.reduce((s, r) => s + Number(r.amount || 0), 0),
    };
  }, [rows, alerts]);

  const statusLabel = (s: ChequeStatus) => t(`paymentCheques.status.${s}` as 'paymentCheques.status.pending');
  const paperLabel = (p: ChequePaperType) => t(`paymentCheques.paper.${p}` as 'paymentCheques.paper.cheque');

  const statusTone = (s: ChequeStatus): string => {
    const map: Record<string, string> = {
      pending: 'draft',
      delivered: 'approved',
      paid: 'posted',
      cancelled: 'cancelled',
      returned: 'void',
      rejected: 'void',
    };
    return map[s] ?? 'draft';
  };

  const openAdd = () => {
    setPaperForm(emptyPaperForm(accounts[0]?.id ?? ''));
    setPaperOpen(true);
  };

  const openPay = (row: ChequeDto) => {
    setPayTarget(row);
    setPayForm(emptyPayForm(row));
    setPayOpen(true);
  };

  const savePaper = async () => {
    if (!paperForm.cheque_number.trim() || !paperForm.bank_account || !isPositiveMoneyAmount(paperForm.amount) || !paperForm.due_date) {
      setError(t('banking.chequeRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        paper_type: paperForm.paper_type,
        direction: paperForm.direction,
        cheque_number: paperForm.cheque_number.trim(),
        bank_account: paperForm.bank_account,
        amount: toApiMoneyAmount(paperForm.amount),
        due_date: paperForm.due_date,
        party_name: paperForm.party_name.trim(),
        notes: paperForm.notes.trim(),
      };
      if (paperForm.delivery_date) payload.delivery_date = paperForm.delivery_date;
      await chequesApi.create(payload);
      setPaperOpen(false);
      await load();
      showPremiumToast({ tone: 'success', title: t('paymentCheques.paperSaved') });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('banking.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const savePay = async () => {
    if (!payTarget || !isPositiveMoneyAmount(payForm.amount)) return;
    setSaving(true);
    setError(null);
    try {
      const payload: ChequePayPayload = {
        pay_source: payForm.pay_source,
        amount: toApiMoneyAmount(payForm.amount),
        pay_date: payForm.pay_date,
        pay_notes: payForm.pay_notes.trim(),
      };
      if (payForm.pay_source === 'bank') payload.pay_bank_account = payForm.pay_bank_account;
      await chequesApi.pay(payTarget.id, payload);
      setPayOpen(false);
      setPayTarget(null);
      await load();
      showPremiumToast({ tone: 'success', title: t('paymentCheques.paySuccess') });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('banking.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('banking.saveFailed'));
    }
  };

  if (!canView) {
    return <AlertBanner variant="error">{t('paymentCheques.noAccess')}</AlertBanner>;
  }

  const filterSelect = 'erp-native-select erp-smart-filter-select min-h-10 rounded-xl border bg-white ps-3 !pe-10 text-sm';

  return (
    <div className="payment-cheques-shell space-y-4">
      <PageSectionHeader
        icon={<FileCheck className="h-6 w-6" />}
        title={t('nav.paymentCheques')}
        description={t('paymentCheques.pageDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button type="button" size="sm" onClick={openAdd} disabled={!accounts.length}>
              <Plus className="h-4 w-4 me-1" />
              {t('paymentCheques.addPaper')}
            </Button>
          </PageToolbar>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <AlertBanner variant="info">
        {t('paymentCheques.trackingFlowHint')}{' '}
        <button
          type="button"
          className="font-bold underline underline-offset-2 ms-1"
          onClick={() => appNavigate('supplier-payments')}
        >
          {t('nav.supplierPayments')}
        </button>
      </AlertBanner>

      {alerts.length > 0 ? (
        <AlertBanner variant="warning">
          <AlertTriangle className="inline h-4 w-4 me-1" />
          {t('paymentCheques.alertsTitle', { count: String(alerts.length) })}
        </AlertBanner>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label={t('paymentCheques.kpiActive')} value={String(kpis.active)} />
        <Kpi label={t('paymentCheques.kpiPending')} value={String(kpis.pending)} warn />
        <Kpi label={t('paymentCheques.kpiDueSoon')} value={String(kpis.dueSoon)} warn={kpis.dueSoon > 0} />
        <Kpi label={t('paymentCheques.kpiTotalDue')} value={fmtMoney(kpis.totalDue)} accent />
      </div>

      <div className="erp-smart-filter-bar rounded-2xl border bg-white p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 start-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('paymentCheques.search')}
            className="w-full h-10 rounded-xl border ps-9 pe-3 text-sm"
          />
        </div>
        <div className="inline-flex rounded-xl border bg-slate-50 p-1 gap-1 flex-wrap">
          <FilterChip active={!paperFilter} label={t('paymentCheques.allPapers')} onClick={() => setPaperFilter('')} />
          {PAPER_TYPES.map((p) => (
            <FilterChip
              key={p}
              active={paperFilter === p}
              label={paperLabel(p)}
              onClick={() => setPaperFilter(p)}
            />
          ))}
        </div>
        <select
          className={filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ChequeStatus | '')}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s || 'all'} value={s}>
              {s ? statusLabel(s) : t('banking.allStatuses')}
            </option>
          ))}
        </select>
        <select
          className={filterSelect}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as '' | 'supplier' | 'manual')}
        >
          <option value="">{t('paymentCheques.allSources')}</option>
          <option value="supplier">{t('paymentCheques.sourceSupplier')}</option>
          <option value="manual">{t('paymentCheques.sourceManual')}</option>
        </select>
      </div>

      <DataCard>
        {loading ? (
          <p className="py-16 text-center text-slate-500">{t('inventory.loading')}</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileCheck className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">{t('paymentCheques.empty')}</p>
            <Button type="button" size="sm" className="mt-4" onClick={openAdd} disabled={!accounts.length}>
              <Plus className="h-4 w-4 me-1" />
              {t('paymentCheques.addPaper')}
            </Button>
          </div>
        ) : (
          <DataTable minWidth="1100px">
            <TableHead>
              <Th>{t('paymentCheques.colPaper')}</Th>
              <Th>{t('paymentCheques.colSource')}</Th>
              <Th>{t('banking.chequeNumber')}</Th>
              <Th>{t('banking.partyName')}</Th>
              <Th>{t('banking.account')}</Th>
              <Th align="end">{t('accounting.amount')}</Th>
              <Th>{t('banking.dueDate')}</Th>
              <Th>{t('inventory.status')}</Th>
              <Th align="end">{t('inventory.actions')}</Th>
            </TableHead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  id={`cheque-row-${row.id}`}
                  className={cn(
                    'border-t border-slate-100 hover:bg-slate-50/50',
                    highlightId === row.id && 'bg-amber-50 ring-2 ring-amber-200 ring-inset',
                  )}
                >
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-bold text-slate-700">{paperLabel(row.paper_type)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {row.source === 'supplier_payment' && row.supplier_payment_code ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
                        onClick={() => appNavigate('supplier-payments')}
                        title={row.supplier_payment_code}
                      >
                        {row.supplier_payment_code}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="text-slate-500">{t('paymentCheques.sourceManual')}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-blue-700">{row.cheque_number}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{row.party_name || '—'}</td>
                  <td className="px-3 py-2.5 text-sm">
                    {row.bank_account_name}
                    <div className="text-xs text-slate-500">{row.bank_name}</div>
                  </td>
                  <td className="px-3 py-2.5 text-end font-bold tabular-nums text-emerald-700">
                    {fmtMoney(row.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.due_date}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={statusTone(row.status)} label={statusLabel(row.status)} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1 flex-wrap">
                      {row.status === 'pending' ? (
                        <>
                          <ActionBtn icon={Truck} title={t('paymentCheques.deliver')} onClick={() => runAction(() => chequesApi.deliver(row.id))} />
                          <ActionBtn icon={CheckCircle2} title={t('paymentCheques.pay')} tone="green" onClick={() => openPay(row)} />
                          <ActionBtn icon={Ban} title={t('paymentCheques.cancel')} tone="red" onClick={() => runAction(() => chequesApi.cancel(row.id))} />
                        </>
                      ) : null}
                      {row.status === 'delivered' ? (
                        <>
                          <ActionBtn icon={CheckCircle2} title={t('paymentCheques.pay')} tone="green" onClick={() => openPay(row)} />
                          <ActionBtn icon={RotateCcw} title={t('paymentCheques.return')} tone="red" onClick={() => runAction(() => chequesApi.return(row.id))} />
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </DataCard>

      <ErpSideDrawer
        open={paperOpen}
        onOpenChange={setPaperOpen}
        title={t('paymentCheques.addPaper')}
        description={t('paymentCheques.addPaperDesc')}
        saveLabel={t('inventory.save')}
        cancelLabel={t('inventory.cancel')}
        disabled={saving}
        onSave={savePaper}
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold">{t('paymentCheques.colPaper')}</span>
            <select
              className={filterSelect}
              value={paperForm.paper_type}
              onChange={(e) => setPaperForm((f) => ({ ...f, paper_type: e.target.value as ChequePaperType }))}
            >
              {PAPER_TYPES.map((p) => (
                <option key={p} value={p}>
                  {paperLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">{t('banking.chequeNumber')} *</span>
            <input className="w-full h-10 rounded-xl border px-3 text-sm" value={paperForm.cheque_number} onChange={(e) => setPaperForm((f) => ({ ...f, cheque_number: e.target.value }))} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">{t('banking.account')} *</span>
            <select className={filterSelect} value={paperForm.bank_account} onChange={(e) => setPaperForm((f) => ({ ...f, bank_account: e.target.value }))}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name_ar} — {a.bank_name}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">{t('accounting.amount')} *</span>
            <MoneyAmountInput value={paperForm.amount} onChange={(v) => setPaperForm((f) => ({ ...f, amount: v }))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-sm font-bold">{t('banking.dueDate')} *</span>
              <input type="date" className="w-full h-10 rounded-xl border px-3 text-sm" value={paperForm.due_date} onChange={(e) => setPaperForm((f) => ({ ...f, due_date: e.target.value }))} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold">{t('banking.deliveryDate')}</span>
              <input type="date" className="w-full h-10 rounded-xl border px-3 text-sm" value={paperForm.delivery_date} onChange={(e) => setPaperForm((f) => ({ ...f, delivery_date: e.target.value }))} />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-bold">{t('banking.partyName')}</span>
            <input className="w-full h-10 rounded-xl border px-3 text-sm" value={paperForm.party_name} onChange={(e) => setPaperForm((f) => ({ ...f, party_name: e.target.value }))} />
          </label>
          <textarea className="w-full min-h-[72px] rounded-xl border px-3 py-2 text-sm" value={paperForm.notes} onChange={(e) => setPaperForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </ErpSideDrawer>

      <ErpSideDrawer
        open={payOpen}
        onOpenChange={setPayOpen}
        title={t('paymentCheques.cashDrawerTitle')}
        description={t('paymentCheques.cashDrawerDesc')}
        saveLabel={t('paymentCheques.confirmCash')}
        cancelLabel={t('inventory.cancel')}
        disabled={saving || !isPositiveMoneyAmount(payForm.amount)}
        onSave={savePay}
      >
        {payTarget ? (
          <div className="space-y-5">
            <div className="rounded-xl border bg-slate-50 p-4 text-sm space-y-1">
              <p className="font-bold">{payTarget.cheque_number} — {paperLabel(payTarget.paper_type)}</p>
              <p className="text-slate-600">{payTarget.party_name}</p>
              <p className="font-bold text-emerald-700 tabular-nums">{fmtMoney(payTarget.amount)}</p>
            </div>

            <div>
              <span className="text-sm font-bold block mb-2">{t('paymentCheques.paySourceLabel')} *</span>
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'bank'] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setPayForm((f) => ({ ...f, pay_source: src }))}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-sm font-bold',
                      payForm.pay_source === src ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200',
                    )}
                  >
                    {t(`paymentCheques.paySource.${src}`)}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-bold">{t('paymentCheques.payDate')} *</span>
              <input type="date" className="w-full h-10 rounded-xl border px-3 text-sm" value={payForm.pay_date} onChange={(e) => setPayForm((f) => ({ ...f, pay_date: e.target.value }))} />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold">{t('paymentCheques.payAmount')} *</span>
              <MoneyAmountInput value={payForm.amount} onChange={(v) => setPayForm((f) => ({ ...f, amount: v }))} />
              {isPositiveMoneyAmount(payForm.amount) ? (
                <PaymentAmountHero amount={payForm.amount} locale={locale} size="sm" currencyLabel={locale === 'ar' ? 'جنيه' : 'EGP'} />
              ) : null}
            </label>

            {payForm.pay_source === 'bank' ? (
              <label className="block space-y-2">
                <span className="text-sm font-bold">{t('paymentCheques.payBankAccount')} *</span>
                <select className={filterSelect} value={payForm.pay_bank_account} onChange={(e) => setPayForm((f) => ({ ...f, pay_bank_account: e.target.value }))}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name_ar} — {a.bank_name}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm font-bold">{t('inventory.notes')}</span>
              <textarea className="w-full min-h-[72px] rounded-xl border px-3 py-2 text-sm" value={payForm.pay_notes} onChange={(e) => setPayForm((f) => ({ ...f, pay_notes: e.target.value }))} />
            </label>
          </div>
        ) : null}
      </ErpSideDrawer>
    </div>
  );
}

function Kpi({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn('text-xl font-bold tabular-nums mt-0.5', accent && 'text-emerald-700', warn && 'text-amber-700', !accent && !warn && 'text-slate-900')}>{value}</p>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap', active ? 'bg-white shadow-sm ring-1 ring-slate-200 text-slate-900' : 'text-slate-600')}>
      {label}
    </button>
  );
}

function ActionBtn({ icon: Icon, title, onClick, tone }: { icon: React.ComponentType<{ className?: string }>; title: string; onClick: () => void; tone?: 'green' | 'red' }) {
  return (
    <Button type="button" size="sm" variant="outline" title={title} onClick={onClick} className={cn(tone === 'green' && 'text-emerald-700', tone === 'red' && 'text-rose-700')}>
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}
