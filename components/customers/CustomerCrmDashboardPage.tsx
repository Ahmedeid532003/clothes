import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, MessageCircle, TrendingUp, Users } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { receivablesApi, type CrmDashboard, type CustomerInsightRow } from '@/lib/api/receivables';
import { AlertBanner, PageToolbar, appNavigate, fmtMoney } from '@/components/accounting/AccountingUi';
import {
  CrmDataCard,
  CrmKpiCard,
  CrmPageHeader,
  CrmTableWrap,
  CrmTh,
  CrmThead,
  CustomersModuleLayout,
} from '@/components/customers/CustomersUi';
import { Button } from '@/components/ui/button';

function InsightTable({
  title,
  rows,
  onRowClick,
}: {
  title: string;
  rows: CustomerInsightRow[];
  onRowClick?: (id: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <CrmDataCard title={title}>
      <CrmTableWrap minWidth="480px">
        <CrmThead>
          <CrmTh>{t('accounting.colName')}</CrmTh>
          <CrmTh align="end">{t('customers.arrears')}</CrmTh>
          <CrmTh align="end">{t('crm.churn')}</CrmTh>
        </CrmThead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-8 text-center text-slate-500 text-sm">
                —
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.id}
                className="border-t hover:bg-indigo-50/50 cursor-pointer"
                onClick={() => onRowClick?.(r.id)}
              >
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-sm">{r.name_ar}</div>
                  <div className="font-mono text-xs text-slate-500">{r.code}</div>
                </td>
                <td className="px-4 py-2.5 text-end tabular-nums text-sm">
                  {fmtMoney(r.overdue_total || r.balance_due)}
                </td>
                <td className="px-4 py-2.5 text-end">
                  <span
                    className={
                      r.churn_probability >= 55
                        ? 'text-red-700 font-bold text-sm'
                        : 'text-slate-600 text-sm'
                    }
                  >
                    {r.churn_probability}%
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </CrmTableWrap>
    </CrmDataCard>
  );
}

export function CustomerCrmDashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<CrmDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await receivablesApi.crmDashboard());
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

  const k = data?.kpis;

  return (
    <CustomersModuleLayout>
      <CrmPageHeader
        title={t('crm.dashboardTitle')}
        description={t('crm.dashboardDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" variant="outline" onClick={() => appNavigate('customer-arrears')}>
              {t('crm.arrearsLink')}
            </Button>
            <Button size="sm" onClick={async () => { await receivablesApi.runAutoReminders(); load(); }}>
              <Bell className="h-4 w-4 me-1" />
              {t('crm.runReminders')}
            </Button>
          </PageToolbar>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {loading && !data ? (
        <p className="py-12 text-center text-slate-500">{t('inventory.loading')}</p>
      ) : null}

      {data?.notifications?.map((n, i) => (
        <AlertBanner
          key={i}
          variant={n.level === 'error' ? 'error' : n.level === 'warning' ? 'warning' : 'info'}
        >
          <button type="button" className="text-start w-full" onClick={() => n.action && appNavigate(n.action)}>
            {n.message_ar}
          </button>
        </AlertBanner>
      ))}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            <CrmKpiCard
              label={t('crm.totalDebt')}
              value={fmtMoney(k?.total_debt ?? 0)}
              tone="danger"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <CrmKpiCard
              label={t('crm.collectionRate')}
              value={`${k?.collection_rate_percent ?? 0}%`}
              tone="ok"
            />
            <CrmKpiCard label={t('crm.riskyCount')} value={k?.risky_customers_count ?? 0} tone="warn" />
            <CrmKpiCard label={t('crm.overdue')} value={k?.overdue_count ?? 0} tone="danger" />
            <CrmKpiCard label={t('crm.inactive')} value={k?.inactive_count ?? 0} />
            <CrmKpiCard label={t('crm.atRisk')} value={k?.at_risk_count ?? 0} tone="warn" />
            <CrmKpiCard label={t('crm.followup')} value={k?.followup_count ?? 0} tone="info" />
            <CrmKpiCard label={t('crm.avgCollectionDays')} value={k?.avg_collection_days ?? 0} />
          </div>

          <CrmDataCard title={t('crm.agingTitle')}>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 p-4">
              {[
                ['current', t('crm.bucketCurrent'), 'from-emerald-50 to-white border-emerald-200'],
                ['1_30', '1-30', 'from-lime-50 to-white'],
                ['31_60', '31-60', 'from-amber-50 to-white'],
                ['61_90', '61-90', 'from-orange-50 to-white'],
                ['91_120', '91-120', 'from-red-50 to-white'],
                ['120_plus', '120+', 'from-red-100 to-white border-red-300'],
              ].map(([key, label, bg]) => (
                <div
                  key={key}
                  className={`rounded-xl border bg-gradient-to-br p-3 text-center shadow-sm ${bg}`}
                >
                  <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 font-bold tabular-nums text-slate-900">
                    {fmtMoney(data.aging?.[key] ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          </CrmDataCard>

          <div className="grid lg:grid-cols-2 gap-4">
            <InsightTable
              title={t('crm.inactiveCustomers')}
              rows={data.inactive_customers}
              onRowClick={() => appNavigate('customers')}
            />
            <InsightTable
              title={t('crm.topBuyers')}
              rows={data.top_buyers}
              onRowClick={() => appNavigate('customers')}
            />
            <InsightTable
              title={t('crm.overdueCustomers')}
              rows={data.overdue_customers}
              onRowClick={() => appNavigate('customer-arrears')}
            />
            <InsightTable
              title={t('crm.atRisk')}
              rows={data.at_risk_customers}
              onRowClick={() => appNavigate('customer-arrears')}
            />
          </div>

          <CrmDataCard title={t('crm.salespersonKpi')}>
            <CrmTableWrap minWidth="640px">
              <CrmThead>
                <CrmTh>{t('customers.salesperson')}</CrmTh>
                <CrmTh align="end">{t('customers.clients')}</CrmTh>
                <CrmTh align="end">{t('customers.sales')}</CrmTh>
                <CrmTh align="end">{t('crm.overdue')}</CrmTh>
              </CrmThead>
              <tbody>
                {data.salesperson_kpis.map((s) => (
                  <tr key={s.user_id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5 text-end">{s.customers_count}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{fmtMoney(s.total_sales)}</td>
                    <td className="px-4 py-2.5 text-end">{s.overdue_customers}</td>
                  </tr>
                ))}
              </tbody>
            </CrmTableWrap>
          </CrmDataCard>

          <div className="flex flex-wrap gap-3 rounded-xl border bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-green-600" /> {t('crm.integrations')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-600" /> {t('crm.scheduler')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {t('crm.autoEngine')}
            </span>
          </div>
        </>
      )}
    </CustomersModuleLayout>
  );
}
