import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronRight,
  Pencil,
  Plus,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  customerGroupsApi,
  type CustomerGroupDto,
  type GroupsDashboard,
} from '@/lib/api/customers';
import { fetchEmployees } from '@/lib/api/employees';
import { AlertBanner, DataCard, DataTable, PageToolbar, TableHead, Th, fmtMoney } from '@/components/accounting/AccountingUi';
import { CrmKpiCard, CrmPageHeader, CustomersModuleLayout } from '@/components/customers/CustomersUi';
import { GROUP_COLOR_PRESETS } from '@/lib/customers/collectionTier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function CustomerGroupsPage() {
  const { t } = useLanguage();
  const [dashboard, setDashboard] = useState<GroupsDashboard | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CustomerGroupDto | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerGroupDto | null>(null);
  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    parent: '',
    default_discount_percent: '0',
    default_payment_policy: 'cash',
    default_credit_limit: '0',
    region: '',
    risk_level: 'medium',
    volume_tier: 'medium',
    salesperson: '',
    notes: '',
    display_color: '#4F46E5',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, emp] = await Promise.all([
        customerGroupsApi.dashboard(),
        fetchEmployees(),
      ]);
      setDashboard(dash);
      setEmployees(emp.map((e) => ({ id: e.id, name: e.full_name || e.username })));
      if (dash.groups.length) {
        setSelected((prev) => prev ?? dash.groups[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const groups = dashboard?.groups ?? [];

  const parentOptions = useMemo(
    () => groups.map((g) => ({ id: g.id, label: `${'—'.repeat(g.level)} ${g.name_ar}` })),
    [groups],
  );

  const openAdd = (parentId?: string) => {
    setEditing(null);
    setForm({
      name_ar: '',
      name_en: '',
      parent: parentId || '',
      default_discount_percent: '0',
      default_payment_policy: 'cash',
      default_credit_limit: '0',
      region: '',
      risk_level: 'medium',
      volume_tier: 'medium',
      salesperson: '',
      notes: '',
      display_color: '#4F46E5',
    });
    setOpen(true);
  };

  const openEdit = (g: CustomerGroupDto) => {
    setEditing(g);
    setForm({
      name_ar: g.name_ar,
      name_en: g.name_en,
      parent: g.parent || '',
      default_discount_percent: g.default_discount_percent,
      default_payment_policy: g.default_payment_policy,
      default_credit_limit: g.default_credit_limit,
      region: g.region,
      risk_level: g.risk_level,
      volume_tier: g.volume_tier,
      salesperson: g.salesperson || '',
      notes: g.notes,
      display_color: g.display_color || '#4F46E5',
    });
    setOpen(true);
  };

  const onSave = async () => {
    const payload = {
      ...form,
      name_en: form.name_ar.trim(),
      parent: form.parent || null,
      salesperson: form.salesperson || null,
    };
    try {
      if (editing) await customerGroupsApi.update(editing.id, payload);
      else await customerGroupsApi.create(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const stats = selected?.stats;

  return (
    <CustomersModuleLayout>
      <CrmPageHeader
        title={t('nav.customerGroups')}
        description={t('customers.groupsDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={() => openAdd()}>
              <Plus className="h-4 w-4 me-1" />
              {t('customers.addGroup')}
            </Button>
          </PageToolbar>
        }
      />
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {dashboard?.totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <CrmKpiCard label={t('customers.totalClients')} value={dashboard.totals.customers_count} />
          <CrmKpiCard label={t('customers.totalSales')} value={fmtMoney(dashboard.totals.total_sales)} tone="ok" />
          <CrmKpiCard label={t('customers.totalArrears')} value={fmtMoney(dashboard.totals.balance_due)} tone="warn" />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        <DataCard title={t('customers.groupTree')} className="lg:col-span-2">
          <div className="max-h-[480px] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-slate-500">{t('inventory.loading')}</p>
            ) : (
              groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelected(g)}
                  className={`w-full text-start px-3 py-2 border-b text-sm flex items-center gap-1 hover:bg-slate-50 ${
                    selected?.id === g.id ? 'bg-blue-50 border-s-2 border-s-blue-400' : ''
                  }`}
                >
                  <span style={{ paddingInlineStart: `${g.level * 12}px` }} className="flex items-center gap-1 flex-1">
                    {g.level > 0 ? <ChevronRight className="h-3 w-3 shrink-0" /> : null}
                    <span className="font-mono text-xs text-blue-700">{g.code}</span>
                    <span className="font-medium">{g.name_ar}</span>
                  </span>
                  <span className="text-xs text-slate-500">{g.stats?.customers_count ?? 0}</span>
                </button>
              ))
            )}
          </div>
        </DataCard>

        <div className="lg:col-span-3 space-y-3">
          {selected ? (
            <>
              <div className="rounded-xl border bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4">
                <p className="text-sm opacity-80">{selected.path_label}</p>
                <h3 className="text-xl font-bold mt-1">{selected.name_ar}</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(selected)}>
                    <Pencil className="h-3 w-3 me-1" />
                    {t('inventory.edit')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openAdd(selected.id)}>
                    <Plus className="h-3 w-3 me-1" />
                    {t('customers.addChild')}
                  </Button>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <MiniStat label={t('customers.clients')} value={String(stats.customers_count)} />
                  <MiniStat label={t('customers.sales')} value={fmtMoney(stats.total_sales)} />
                  <MiniStat label={t('customers.arrears')} value={fmtMoney(stats.balance_due)} />
                  <MiniStat label={t('customers.avgCollection')} value={`${stats.avg_collection_percent}%`} />
                  <MiniStat label={t('customers.activityRate')} value={`${stats.activity_rate_percent}%`} />
                  <MiniStat label={t('customers.active30')} value={String(stats.active_last_30_days)} />
                </div>
              )}

              <DataCard title={t('customers.groupPolicies')}>
                <dl className="grid sm:grid-cols-2 gap-2 p-3 text-sm">
                  <Item label={t('customers.defaultDiscount')} value={`${selected.default_discount_percent}%`} />
                  <Item label={t('customers.paymentPolicy')} value={selected.default_payment_policy} />
                  <Item label={t('customers.creditLimit')} value={fmtMoney(selected.default_credit_limit)} />
                  <Item label={t('customers.region')} value={selected.region || '—'} />
                  <Item label={t('customers.risk')} value={selected.risk_level} />
                  <Item label={t('customers.volume')} value={selected.volume_tier} />
                  <Item label={t('customers.salesperson')} value={selected.salesperson_name || '—'} />
                </dl>
              </DataCard>
            </>
          ) : (
            <div className="rounded-xl border p-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <BarChart3 className="h-10 w-10 opacity-40" />
              {t('customers.selectGroup')}
            </div>
          )}
        </div>
      </div>

      <DataCard title={t('customers.groupsTable')}>
        <DataTable minWidth="900px">
          <TableHead>
            <Th>{t('inventory.code')}</Th>
            <Th>{t('accounting.colName')}</Th>
            <Th>{t('customers.clients')}</Th>
            <Th align="end">{t('customers.sales')}</Th>
            <Th align="end">{t('customers.arrears')}</Th>
            <Th align="end">{t('customers.activityRate')}</Th>
          </TableHead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t hover:bg-slate-50/50">
                <td className="px-3 py-2 font-mono text-xs">{g.code}</td>
                <td className="px-3 py-2" style={{ paddingInlineStart: `${12 + g.level * 12}px` }}>
                  {g.name_ar}
                </td>
                <td className="px-3 py-2">{g.stats?.customers_count ?? 0}</td>
                <td className="px-3 py-2 text-end tabular-nums">{fmtMoney(g.stats?.total_sales)}</td>
                <td className="px-3 py-2 text-end tabular-nums">{fmtMoney(g.stats?.balance_due)}</td>
                <td className="px-3 py-2 text-end">{g.stats?.activity_rate_percent ?? 0}%</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </DataCard>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? t('customers.editGroup') : t('customers.addGroup')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder={t('accounting.nameAr')} />
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
              <option value="">{t('accounting.rootLevel')}</option>
              {parentOptions.filter((p) => p.id !== editing?.id).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder={t('customers.defaultDiscount')} value={form.default_discount_percent} onChange={(e) => setForm({ ...form, default_discount_percent: e.target.value })} />
              <Input type="number" placeholder={t('customers.creditLimit')} value={form.default_credit_limit} onChange={(e) => setForm({ ...form, default_credit_limit: e.target.value })} />
            </div>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.default_payment_policy} onChange={(e) => setForm({ ...form, default_payment_policy: e.target.value })}>
              <option value="cash">{t('customers.payCash')}</option>
              <option value="credit_7">{t('customers.pay7')}</option>
              <option value="credit_15">{t('customers.pay15')}</option>
              <option value="credit_30">{t('customers.pay30')}</option>
              <option value="credit_60">{t('customers.pay60')}</option>
              <option value="installment">{t('customers.payInstallment')}</option>
            </select>
            <Input placeholder={t('customers.region')} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded-md border px-2 py-2 text-sm" value={form.risk_level} onChange={(e) => setForm({ ...form, risk_level: e.target.value })}>
                <option value="low">{t('customers.riskLow')}</option>
                <option value="medium">{t('customers.riskMedium')}</option>
                <option value="high">{t('customers.riskHigh')}</option>
                <option value="blocked">{t('customers.riskBlocked')}</option>
              </select>
              <select className="rounded-md border px-2 py-2 text-sm" value={form.volume_tier} onChange={(e) => setForm({ ...form, volume_tier: e.target.value })}>
                <option value="small">{t('customers.volSmall')}</option>
                <option value="medium">{t('customers.volMedium')}</option>
                <option value="large">{t('customers.volLarge')}</option>
                <option value="key">{t('customers.volKey')}</option>
              </select>
            </div>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.salesperson} onChange={(e) => setForm({ ...form, salesperson: e.target.value })}>
              <option value="">{t('customers.salesperson')}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <div>
              <label className="text-xs text-slate-500 block mb-1">{t('customers.displayColor')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {GROUP_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 ${form.display_color === c ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-200'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, display_color: c })}
                  />
                ))}
              </div>
              <Input value={form.display_color} onChange={(e) => setForm({ ...form, display_color: e.target.value })} placeholder="#4F46E5" />
              <p className="text-[10px] text-slate-400 mt-1">{t('customers.displayColorHint')}</p>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={onSave}>{t('departments.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </CustomersModuleLayout>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-2 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-bold text-sm tabular-nums">{value}</p>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
