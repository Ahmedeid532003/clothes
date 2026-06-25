import React, { useCallback, useEffect, useState } from 'react';
import { Check, Package, Plus, Send } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  consignmentApi,
  type ConsignmentDashboard,
  type ConsignmentMovement,
  type ConsignmentMovementType,
} from '@/lib/api/consignment';
import { customersApi } from '@/lib/api/customers';
import { fetchStockBalances, fetchWarehouses, type StockBalanceDto } from '@/lib/api/inventory';
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
  CrmFormulaBanner,
  CrmKpiCard,
  CrmPageHeader,
  CrmTableWrap,
  CrmTh,
  CrmThead,
  CustomersModuleLayout,
  crmSelectClass,
} from '@/components/customers/CustomersUi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type Tab = 'dashboard' | 'movements' | 'reports';
type LineForm = { variant: string; quantity: string; unit_price: string; label: string };

const MOVEMENT_TYPES: { id: ConsignmentMovementType; labelKey: string }[] = [
  { id: 'send', labelKey: 'consignment.typeSend' },
  { id: 'return', labelKey: 'consignment.typeReturn' },
  { id: 'transfer', labelKey: 'consignment.typeTransfer' },
  { id: 'count', labelKey: 'consignment.typeCount' },
  { id: 'settlement', labelKey: 'consignment.typeSettlement' },
];

export function ConsignmentHubPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dash, setDash] = useState<ConsignmentDashboard | null>(null);
  const [movements, setMovements] = useState<ConsignmentMovement[]>([]);
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [balances, setBalances] = useState<StockBalanceDto[]>([]);
  const [form, setForm] = useState({
    movement_type: 'send' as ConsignmentMovementType,
    customer: '',
    counterparty_customer: '',
    warehouse: '',
    movement_date: new Date().toISOString().slice(0, 10),
    notes: '',
    lineVariant: '',
    lineQty: '1',
    linePrice: '',
  });
  const [lines, setLines] = useState<LineForm[]>([]);
  const [detail, setDetail] = useState<ConsignmentMovement | null>(null);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [realtimeSales, setRealtimeSales] = useState<string | null>(null);
  const [reportRows, setReportRows] = useState<
    Awaited<ReturnType<typeof consignmentApi.reports>>['customers']
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, m, cust, wh, rep] = await Promise.all([
        consignmentApi.dashboard(),
        consignmentApi.movements({
          type: filterType || undefined,
          customer: filterCustomer || undefined,
        }),
        customersApi.list(),
        fetchWarehouses(),
        consignmentApi.reports(),
      ]);
      setDash(d);
      setMovements(m);
      setReportRows(rep.customers);
      setCustomers(cust.map((c) => ({ id: c.id, name: c.name_ar })));
      setWarehouses(wh.map((w) => ({ id: w.id, name: w.name_ar })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCustomer]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.warehouse) {
      setBalances([]);
      return;
    }
    fetchStockBalances(form.warehouse).then(setBalances);
  }, [form.warehouse]);

  const openNew = (mtype: ConsignmentMovementType = 'send') => {
    setForm({
      movement_type: mtype,
      customer: customers[0]?.id ?? '',
      counterparty_customer: '',
      warehouse: warehouses[0]?.id ?? '',
      movement_date: new Date().toISOString().slice(0, 10),
      notes: '',
      lineVariant: '',
      lineQty: '1',
      linePrice: '',
    });
    setLines([]);
    setOpen(true);
  };

  const addLine = () => {
    const bal = balances.find((b) => b.variant === form.lineVariant);
    if (!bal) return;
    setLines([
      ...lines,
      {
        variant: bal.variant,
        quantity: form.lineQty,
        unit_price: form.linePrice || String(bal.sale_price || 0),
        label: `${bal.product_name} ${bal.size_name}/${bal.color_name}`,
      },
    ]);
    setForm((f) => ({ ...f, lineVariant: '', lineQty: '1', linePrice: '' }));
  };

  const saveMovement = async () => {
    if (!lines.length) return;
    await consignmentApi.createMovement({
      movement_type: form.movement_type,
      customer: form.customer,
      counterparty_customer: form.counterparty_customer || undefined,
      warehouse: form.warehouse,
      movement_date: form.movement_date,
      notes: form.notes,
      lines: lines.map((l) => ({
        variant: l.variant,
        quantity: l.quantity,
        unit_price: l.unit_price,
      })),
    });
    setOpen(false);
    load();
  };

  const openDetail = async (id: string) => {
    setDetail(await consignmentApi.getMovement(id));
  };

  const typeLabel = (ty: string) => {
    const m = MOVEMENT_TYPES.find((x) => x.id === ty);
    return m ? t(m.labelKey) : ty;
  };

  return (
    <CustomersModuleLayout>
      <CrmPageHeader
        title={t('consignment.title')}
        description={t('consignment.desc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={() => openNew('send')}>
              <Plus className="h-4 w-4 me-1" />
              {t('consignment.newMovement')}
            </Button>
          </PageToolbar>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {dash?.alerts?.map((a, i) => (
        <AlertBanner key={i} variant={a.level === 'error' ? 'error' : 'warning'}>
          {a.message_ar}
        </AlertBanner>
      ))}

      <CrmFormulaBanner text={t('consignment.formula')} />

      <div className="flex gap-1 p-1.5 bg-white border rounded-xl shadow-sm w-fit">
        {(['dashboard', 'movements', 'reports'] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold ${
              tab === id ? 'bg-white shadow text-blue-700' : 'text-slate-600'
            }`}
          >
            {t(`consignment.tab_${id}`)}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && dash && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-slate-500">{t('consignment.totalValue')}</p>
              <p className="text-xl font-bold tabular-nums">
                {fmtMoney(dash.kpis.total_consignment_value)}
              </p>
            </div>
            <div className="rounded-xl border bg-emerald-50 p-4">
              <p className="text-xs">{t('consignment.soldQty')}</p>
              <p className="text-xl font-bold">{dash.kpis.total_sold_qty}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs">{t('consignment.sentQty')}</p>
              <p className="text-xl font-bold">{dash.kpis.total_sent_qty}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs">{t('consignment.turnover')}</p>
              <p className="text-xl font-bold">{dash.kpis.turnover_percent}%</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs">{t('consignment.surplusDeficit')}</p>
              <p className="text-xl font-bold">{dash.kpis.surplus_deficit_qty}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs">{t('consignment.activeShops')}</p>
              <p className="text-xl font-bold">{dash.kpis.active_shops}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <CrmDataCard title={t('consignment.topSales')}>
              <ul className="text-sm divide-y">
                {dash.top_sales_shops.map((r, i) => (
                  <li key={i} className="flex justify-between py-2 px-2">
                    <span>{r.customer_name}</span>
                    <span className="font-bold tabular-nums">{r.qty_sold}</span>
                  </li>
                ))}
              </ul>
            </CrmDataCard>
            <CrmDataCard title={t('consignment.topDebt')}>
              <ul className="text-sm divide-y">
                {dash.top_debt_customers.map((r, i) => (
                  <li key={i} className="flex justify-between py-2 px-2">
                    <span>{r.customer_name}</span>
                    <span className="tabular-nums">{fmtMoney(r.balance_due)}</span>
                  </li>
                ))}
              </ul>
            </CrmDataCard>
            <CrmDataCard title={t('consignment.stagnant')}>
              <ul className="text-sm divide-y max-h-48 overflow-y-auto">
                {dash.stagnant_items.map((r, i) => (
                  <li key={i} className="py-2 px-2 text-amber-900">
                    {r.customer_name} — {r.product} ({r.qty_on_hand})
                  </li>
                ))}
              </ul>
            </CrmDataCard>
            <CrmDataCard title={t('consignment.sizeColor')}>
              <div className="grid grid-cols-2 gap-2 p-2 text-xs">
                <div>
                  <p className="font-bold mb-1">{t('inventory.sizes')}</p>
                  {dash.size_breakdown.map((s) => (
                    <div key={s.size} className="flex justify-between">
                      <span>{s.size}</span>
                      <span>{s.qty}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-bold mb-1">{t('inventory.colors')}</p>
                  {dash.color_breakdown.map((c) => (
                    <div key={c.color} className="flex justify-between">
                      <span>{c.color}</span>
                      <span>{c.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CrmDataCard>
          </div>
        </>
      )}

      {tab === 'movements' && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="rounded-md border px-3 py-1.5 text-sm"
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
            >
              <option value="">{t('consignment.allShops')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {realtimeSales !== null && (
              <span className="text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1">
                {t('consignment.realtimeSales')}: {realtimeSales}
              </span>
            )}
            <select
              className="rounded-md border px-3 py-1.5 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">{t('consignment.allTypes')}</option>
              {MOVEMENT_TYPES.map((mt) => (
                <option key={mt.id} value={mt.id}>
                  {t(mt.labelKey)}
                </option>
              ))}
            </select>
            {MOVEMENT_TYPES.map((mt) => (
              <Button key={mt.id} size="sm" variant="outline" onClick={() => openNew(mt.id)}>
                + {t(mt.labelKey)}
              </Button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <CrmDataCard>
              <DataTable minWidth="640px">
                <TableHead>
                  <Th>{t('inventory.code')}</Th>
                  <Th>{t('consignment.movementType')}</Th>
                  <Th>{t('accounting.colName')}</Th>
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
                    movements.map((m) => (
                      <tr
                        key={m.id}
                        className="border-t hover:bg-slate-50 cursor-pointer"
                        onClick={() => openDetail(m.id)}
                      >
                        <td className="px-3 py-2 font-mono text-xs">{m.code}</td>
                        <td className="px-3 py-2 text-sm">{typeLabel(m.movement_type)}</td>
                        <td className="px-3 py-2">{m.customer_name}</td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            status={m.status === 'approved' ? 'posted' : 'draft'}
                            label={m.status}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </CrmDataCard>

            <CrmDataCard title={detail?.code ?? t('consignment.detail')}>
              {detail ? (
                <div className="space-y-3 p-2">
                  <p className="text-sm">
                    {typeLabel(detail.movement_type)} — {detail.customer_name}
                    {detail.counterparty_name ? ` → ${detail.counterparty_name}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {detail.warehouse_name} · {detail.movement_date} · {fmtMoney(detail.total_value)}
                  </p>
                  {detail.status === 'draft' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          consignmentApi.approve(detail.id).then(() => openDetail(detail.id))
                        }
                      >
                        <Check className="h-4 w-4 me-1" />
                        {t('consignment.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          consignmentApi.cancel(detail.id).then(() => {
                            setDetail(null);
                            load();
                          })
                        }
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  )}
                  <DataTable minWidth="400px">
                    <TableHead>
                      <Th>{t('inventory.products')}</Th>
                      <Th>{t('inventory.sizes')}</Th>
                      <Th>{t('inventory.colors')}</Th>
                      <Th align="end">{t('inventory.quantity')}</Th>
                    </TableHead>
                    <tbody>
                      {(detail.lines ?? []).map((ln) => (
                        <tr key={ln.id} className="border-t text-sm">
                          <td className="px-2 py-1">{ln.product_name}</td>
                          <td className="px-2 py-1">{ln.size}</td>
                          <td className="px-2 py-1">{ln.color}</td>
                          <td className="px-2 py-1 text-end tabular-nums">{ln.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              ) : (
                <p className="p-6 text-center text-slate-500 text-sm">{t('consignment.selectMovement')}</p>
              )}
            </CrmDataCard>
          </div>
        </>
      )}

      {tab === 'reports' && (
        <CrmDataCard title={t('consignment.reportsTitle')}>
          <DataTable minWidth="900px">
            <TableHead>
              <Th>{t('inventory.code')}</Th>
              <Th>{t('accounting.colName')}</Th>
              <Th align="end">{t('consignment.sentQty')}</Th>
              <Th align="end">{t('consignment.onHand')}</Th>
              <Th align="end">{t('consignment.soldQty')}</Th>
              <Th align="end">{t('customers.arrears')}</Th>
            </TableHead>
            <tbody>
              {reportRows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.customer_code}</td>
                  <td className="px-3 py-2">{r.customer_name}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{r.qty_sent}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{r.qty_on_hand}</td>
                  <td className="px-3 py-2 text-end tabular-nums font-bold text-emerald-800">
                    {r.qty_sold}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">{fmtMoney(r.balance_due)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </CrmDataCard>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('consignment.newMovement')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.movement_type}
              onChange={(e) =>
                setForm({ ...form, movement_type: e.target.value as ConsignmentMovementType })
              }
            >
              {MOVEMENT_TYPES.map((mt) => (
                <option key={mt.id} value={mt.id}>
                  {t(mt.labelKey)}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.customer}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {form.movement_type === 'transfer' && (
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.counterparty_customer}
                onChange={(e) => setForm({ ...form, counterparty_customer: e.target.value })}
              >
                <option value="">{t('consignment.toShop')}</option>
                {customers
                  .filter((c) => c.id !== form.customer)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            )}
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.warehouse}
              onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={form.movement_date}
              onChange={(e) => setForm({ ...form, movement_date: e.target.value })}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border px-2 py-2 text-sm"
                value={form.lineVariant}
                onChange={(e) => setForm({ ...form, lineVariant: e.target.value })}
              >
                <option value="">— {t('inventory.products')} —</option>
                {balances.map((b) => (
                  <option key={b.variant} value={b.variant}>
                    {b.product_name} {b.size_name}/{b.color_name} ({b.quantity})
                  </option>
                ))}
              </select>
              <Input
                className="w-20"
                value={form.lineQty}
                onChange={(e) => setForm({ ...form, lineQty: e.target.value })}
              />
              <Button type="button" size="sm" onClick={addLine}>
                +
              </Button>
            </div>
            {lines.length > 0 && (
              <ul className="text-xs space-y-1 border rounded-lg p-2">
                {lines.map((l, i) => (
                  <li key={i}>
                    {l.label} × {l.quantity} @ {l.unit_price}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <SheetFooter>
            <Button onClick={saveMovement} disabled={!lines.length}>
              <Send className="h-4 w-4 me-1" />
              {t('departments.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </CustomersModuleLayout>
  );
}
