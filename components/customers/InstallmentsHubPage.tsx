import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CheckCircle, Layers, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  receivablesApi,
  type InstallmentContract,
  type InstallmentPlan,
} from '@/lib/api/receivables';
import { customersApi } from '@/lib/api/customers';
import {
  AlertBanner,
  DataTable,
  PageToolbar,
  StatusBadge,
  TableHead,
  Th,
  fmtMoney,
} from '@/components/accounting/AccountingUi';
import {
  CrmDataCard,
  CrmPageHeader,
  CrmTableWrap,
  CrmTh,
  CrmThead,
  CustomersModuleLayout,
} from '@/components/customers/CustomersUi';
import { InstallmentPlansPage } from '@/components/customers/InstallmentPlansPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type Tab = 'contracts' | 'reports' | 'plans';

export function InstallmentsHubPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('plans');
  const [contracts, setContracts] = useState<InstallmentContract[]>([]);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [reports, setReports] = useState<Awaited<
    ReturnType<typeof receivablesApi.installmentReports>
  > | null>(null);
  const [detail, setDetail] = useState<InstallmentContract | null>(null);
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ customer: '', plan: '', principal_amount: '', num_installments: '6', down_payment_amount: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, r, cust] = await Promise.all([
        receivablesApi.installmentContracts(),
        receivablesApi.installmentPlans(),
        receivablesApi.installmentReports(),
        customersApi.list(),
      ]);
      setContracts(c);
      setPlans(p);
      setReports(r);
      setCustomers(cust.map((x) => ({ id: x.id, name: x.name_ar })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openContract = async (id: string) => {
    setDetail(await receivablesApi.installmentContract(id));
  };

  const createContract = async () => {
    await receivablesApi.createContract({
      customer: form.customer,
      plan: form.plan || undefined,
      principal_amount: form.principal_amount,
      num_installments: Number(form.num_installments),
      down_payment_amount: form.down_payment_amount || undefined,
    });
    setOpen(false);
    load();
  };

  const selectedPlan = plans.find((p) => p.id === form.plan);
  const principal = Number(form.principal_amount || 0);
  const down = Number(form.down_payment_amount || 0) || principal * (Number(selectedPlan?.down_payment_percent || 0) / 100);
  const interestBase = selectedPlan?.interest_base === 'before_down_payment' ? principal : Math.max(principal - down, 0);
  const interest = selectedPlan?.interest_type === 'fixed'
    ? Number(selectedPlan?.interest_fixed_amount || 0)
    : interestBase * (Number(selectedPlan?.interest_rate_percent || 0) / 100);
  const installmentsCount = Number(form.num_installments || selectedPlan?.default_num_installments || 1);
  const installmentPreview = installmentsCount > 0 ? (Math.max(principal - down, 0) + interest) / installmentsCount : 0;

  const contractAction = async (id: string, action: string, extra?: Record<string, unknown>) => {
    await receivablesApi.contractAction(id, { action, ...extra });
    await openContract(id);
    load();
  };

  const lineDefer = async (lineId: string) => {
    const d = prompt(t('crm.deferDate'), new Date().toISOString().slice(0, 10));
    if (!d || !detail) return;
    await receivablesApi.lineAction(lineId, { action: 'defer', deferred_to: d });
    await openContract(detail.id);
    load();
  };

  const statusMap: Record<string, string> = {
    draft: 'draft',
    pending_approval: 'pending_review',
    active: 'posted',
    completed: 'completed',
    cancelled: 'cancelled',
  };

  return (
    <CustomersModuleLayout>
      <CrmPageHeader
        title={t('crm.installmentsTitle')}
        description={t('crm.installmentsDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={() => setOpen(true)}>
              {t('crm.newContract')}
            </Button>
          </PageToolbar>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {(['contracts', 'reports', 'plans'] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold ${
              tab === id ? 'bg-white shadow text-blue-700' : 'text-slate-600'
            }`}
          >
            {t(`crm.tab_${id}`)}
          </button>
        ))}
      </div>

      {tab === 'contracts' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <CrmDataCard>
            <DataTable minWidth="520px">
              <TableHead>
                <Th>{t('inventory.code')}</Th>
                <Th>{t('accounting.colName')}</Th>
                <Th align="end">{t('crm.principal')}</Th>
                <Th>{t('inventory.status')}</Th>
              </TableHead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      {t('inventory.loading')}
                    </td>
                  </tr>
                ) : (
                  contracts.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t hover:bg-slate-50 cursor-pointer"
                      onClick={() => openContract(c.id)}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                      <td className="px-3 py-2">{c.customer_name}</td>
                      <td className="px-3 py-2 text-end tabular-nums">
                        {fmtMoney(c.principal_amount)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={statusMap[c.status] ?? 'draft'} label={c.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
          </CrmDataCard>

          <CrmDataCard title={detail ? detail.code : t('crm.selectContract')}>
            {detail ? (
              <div className="space-y-3 p-2">
                <div className="flex flex-wrap gap-2">
                  {detail.status === 'draft' && (
                    <Button size="sm" onClick={() => contractAction(detail.id, 'submit_approval')}>
                      {t('crm.submitApproval')}
                    </Button>
                  )}
                  {detail.status === 'pending_approval' && (
                    <Button size="sm" onClick={() => contractAction(detail.id, 'approve')}>
                      <CheckCircle className="h-4 w-4 me-1" />
                      {t('crm.approve')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => contractAction(detail.id, 'recalculate')}
                  >
                    <RefreshCw className="h-4 w-4 me-1" />
                    {t('crm.recalculate')}
                  </Button>
                </div>
                <p className="text-sm">
                  {t('crm.balance')}: {fmtMoney(detail.totals?.balance_due ?? 0)} —{' '}
                  {t('crm.late')}: {detail.totals?.late_count ?? 0}
                </p>
                <DataTable minWidth="400px">
                  <TableHead>
                    <Th>#</Th>
                    <Th>{t('crm.dueDate')}</Th>
                    <Th align="end">{t('crm.amount')}</Th>
                    <Th>{t('inventory.status')}</Th>
                    <Th>{t('inventory.actions')}</Th>
                  </TableHead>
                  <tbody>
                    {(detail.lines ?? []).map((ln) => (
                      <tr key={ln.id} className="border-t text-sm">
                        <td className="px-2 py-1">{ln.sequence}</td>
                        <td className="px-2 py-1">
                          {ln.deferred_to ?? ln.due_date}
                          {ln.deferred_to && ln.deferred_to !== ln.due_date ? (
                            <span className="block text-[10px] text-slate-500">
                              {t('crm.dueDate')}: {ln.due_date}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-1 text-end tabular-nums">{fmtMoney(ln.balance)}</td>
                        <td className="px-2 py-1">
                          <StatusBadge
                            status={
                              ln.status === 'late'
                                ? 'cancelled'
                                : ln.status === 'due'
                                  ? 'pending_review'
                                  : 'draft'
                            }
                            label={ln.status}
                          />
                        </td>
                        <td className="px-2 py-1">
                          {ln.status !== 'paid' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => lineDefer(ln.id)}
                            >
                              {t('crm.defer')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            ) : (
              <p className="p-6 text-sm text-slate-500 text-center">{t('crm.selectContract')}</p>
            )}
          </CrmDataCard>
        </div>
      )}

      {tab === 'reports' && reports && (
        <div className="grid md:grid-cols-2 gap-4">
          <CrmDataCard title={t('crm.dueInstallments')}>
            <ul className="text-sm space-y-1 p-2 max-h-64 overflow-y-auto">
              {reports.due_installments.slice(0, 15).map((ln, i) => (
                <li key={i} className="flex justify-between border-b py-1">
                  <span>
                    {(ln as { customer_name?: string }).customer_name} #{ln.sequence}
                  </span>
                  <span className="tabular-nums">{fmtMoney(ln.balance)}</span>
                </li>
              ))}
            </ul>
          </CrmDataCard>
          <CrmDataCard title={t('crm.overdueInstallments')}>
            <ul className="text-sm space-y-1 p-2 max-h-64 overflow-y-auto">
              {reports.overdue_installments.slice(0, 15).map((ln, i) => (
                <li key={i} className="flex justify-between border-b py-1 text-red-800">
                  <span># {ln.sequence}</span>
                  <span>{fmtMoney(ln.balance)}</span>
                </li>
              ))}
            </ul>
          </CrmDataCard>
          <CrmDataCard title={t('crm.cashflow')} className="md:col-span-2">
            <div className="flex flex-wrap gap-3 p-3">
              {reports.expected_cashflow.map((m) => (
                <div key={m.month} className="rounded-lg border px-3 py-2 min-w-[100px]">
                  <p className="text-xs text-slate-500">{m.month}</p>
                  <p className="font-bold tabular-nums">{fmtMoney(m.amount)}</p>
                </div>
              ))}
            </div>
            <p className="px-3 pb-3 text-sm font-medium">
              {t('crm.expectedCollection')}: {fmtMoney(reports.expected_collection)}
            </p>
          </CrmDataCard>
        </div>
      )}

      {tab === 'plans' && <InstallmentPlansPage embedded />}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('crm.newContract')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <label className="text-xs font-bold">{t('customers.type')}</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.customer}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
            >
              <option value="">—</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="text-xs font-bold">{t('crm.planTemplate')}</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.plan}
              onChange={(e) => {
                const plan = plans.find((p) => p.id === e.target.value);
                setForm({ ...form, plan: e.target.value, num_installments: String(plan?.default_num_installments ?? form.num_installments) });
              }}
            >
              <option value="">—</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_ar}
                </option>
              ))}
            </select>
            <Input
              placeholder={t('crm.principal')}
              value={form.principal_amount}
              onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
            />
            <Input
              placeholder={t('crm.downPayment')}
              value={form.down_payment_amount}
              onChange={(e) => setForm({ ...form, down_payment_amount: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('crm.installments')}
              value={form.num_installments}
              onChange={(e) => setForm({ ...form, num_installments: e.target.value })}
            />
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p>{t('crm.interest')}: {fmtMoney(interest)}</p>
              <p>{t('crm.installmentValue')}: {fmtMoney(installmentPreview)}</p>
              <p>{t('crm.downPayment')}: {fmtMoney(down)}</p>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={createContract} disabled={!form.customer || !form.principal_amount}>
              <CalendarClock className="h-4 w-4 me-1" />
              {t('departments.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </CustomersModuleLayout>
  );
}
