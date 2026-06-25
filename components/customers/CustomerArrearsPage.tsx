import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, MessageCircle, ShieldBan } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  receivablesApi,
  type ArrearsCustomerRow,
  type ArrearsReport,
} from '@/lib/api/receivables';
import { AlertBanner, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import {
  CrmDataCard,
  CrmKpiCard,
  CrmPageHeader,
  CrmTableWrap,
  CrmTh,
  CrmThead,
  CustomersModuleLayout,
  RiskBadge,
} from '@/components/customers/CustomersUi';
import { Button } from '@/components/ui/button';

const BUCKET_OPTIONS = [
  { value: '', labelKey: 'crm.allBuckets' },
  { value: '1_30', label: '1-30' },
  { value: '31_60', label: '31-60' },
  { value: '61_90', label: '61-90' },
  { value: '91_120', label: '91-120' },
  { value: '120_plus', label: '120+' },
];

function agingRowClass(days: number) {
  if (days >= 120) return 'bg-red-50';
  if (days >= 90) return 'bg-orange-50';
  if (days >= 60) return 'bg-amber-50';
  if (days >= 30) return 'bg-yellow-50/80';
  return '';
}

export function CustomerArrearsPage() {
  const { t } = useLanguage();
  const [report, setReport] = useState<ArrearsReport | null>(null);
  const [bucket, setBucket] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remindCustomer, setRemindCustomer] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await receivablesApi.arrears(bucket ? { bucket } : undefined));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [bucket]);

  useEffect(() => {
    load();
  }, [load]);

  const sendReminder = async (row: ArrearsCustomerRow, channel: string) => {
    setRemindCustomer(row.customer_id);
    try {
      const res = await receivablesApi.queueReminder({
        customer: row.customer_id,
        channel,
        message: `تذكير: متأخرات ${row.overdue_total} — ${row.max_days_overdue} يوم تأخير`,
      });
      const url = res.integration?.whatsapp_url;
      if (url) window.open(url, '_blank', 'noopener');
    } finally {
      setRemindCustomer(null);
    }
  };

  const dash = report?.dashboard;

  return (
    <CustomersModuleLayout>
      <CrmPageHeader
        title={t('crm.arrearsTitle')}
        description={t('crm.arrearsDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await receivablesApi.runAutoReminders();
                load();
              }}
            >
              <Bell className="h-4 w-4 me-1" />
              {t('crm.runReminders')}
            </Button>
          </PageToolbar>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CrmKpiCard label={t('crm.totalDebt')} value={fmtMoney(dash?.total_debt ?? 0)} tone="danger" />
        <CrmKpiCard
          label={t('crm.collectionRate')}
          value={`${dash?.collection_rate_percent ?? 0}%`}
          tone="ok"
        />
        <CrmKpiCard label={t('crm.riskyCount')} value={dash?.risky_customers_count ?? 0} tone="warn" />
        <CrmKpiCard label={t('crm.avgCollectionDays')} value={dash?.avg_collection_days ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs font-bold">{t('crm.agingFilter')}</label>
        <select
          className="rounded-md border px-3 py-1.5 text-sm"
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
        >
          {BUCKET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {'labelKey' in o && o.labelKey ? t(o.labelKey) : o.label}
            </option>
          ))}
        </select>
      </div>

      <CrmDataCard>
        <CrmTableWrap minWidth="1100px">
          <CrmThead>
            <CrmTh>{t('accounting.colName')}</CrmTh>
            <CrmTh>{t('inventory.code')}</CrmTh>
            <CrmTh align="end">{t('crm.overdueInvoices')}</CrmTh>
            <CrmTh align="end">{t('crm.overdueTotal')}</CrmTh>
            <CrmTh align="end">{t('crm.daysLate')}</CrmTh>
            <CrmTh>{t('crm.lastPayment')}</CrmTh>
            <CrmTh align="end">{t('crm.compliance')}</CrmTh>
            <CrmTh>{t('customers.salesperson')}</CrmTh>
            <CrmTh>{t('crm.risk')}</CrmTh>
            <CrmTh>{t('crm.churn')}</CrmTh>
            <CrmTh>{t('crm.actions')}</CrmTh>
          </CrmThead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : (report?.customers ?? []).length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-500">
                  {t('crm.noArrears')}
                </td>
              </tr>
            ) : (
              (report?.customers ?? []).map((r) => (
                <tr
                  key={r.customer_id}
                  className={`border-t ${agingRowClass(r.max_days_overdue)}`}
                >
                  <td className="px-3 py-2 font-medium">{r.customer_name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.customer_code}</td>
                  <td className="px-3 py-2 text-end">{r.overdue_invoices}</td>
                  <td className="px-3 py-2 text-end tabular-nums font-semibold">
                    {fmtMoney(r.overdue_total)}
                  </td>
                  <td className="px-3 py-2 text-end font-bold">{r.max_days_overdue}</td>
                  <td className="px-3 py-2 text-xs">{r.last_payment ?? '—'}</td>
                  <td className="px-3 py-2 text-end">{r.compliance_percent}%</td>
                  <td className="px-3 py-2 text-xs">{r.salesperson_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <RiskBadge level={r.risk_level} />
                    {r.block_new_sales ? (
                      <ShieldBan className="inline h-4 w-4 ms-1 text-red-600" title={t('crm.blocked')} />
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-end">{r.churn_probability}%</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        disabled={remindCustomer === r.customer_id}
                        onClick={() => sendReminder(r, 'whatsapp')}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </CrmTableWrap>
      </CrmDataCard>

      <p className="text-xs text-slate-500 px-1">{t('crm.arrearsFeatures')}</p>
    </CustomersModuleLayout>
  );
}
