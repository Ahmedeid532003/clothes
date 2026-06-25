import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  receivablesApi,
  type InstallmentCollectionLine,
  type InstallmentCollectionOverview,
} from '@/lib/api/receivables';
import { customersApi } from '@/lib/api/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';

export function InstallmentCollectionPage() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [customer, setCustomer] = useState('');
  const [amount, setAmount] = useState('');
  const [overview, setOverview] = useState<InstallmentCollectionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cust, ov] = await Promise.all([
        customersApi.list(),
        receivablesApi.installmentCollection(customer || undefined),
      ]);
      setCustomers(cust.map((c) => ({ id: c.id, name: c.name_ar })));
      setOverview(ov);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    load();
  }, [load]);

  const collect = async () => {
    if (!customer || !amount) return;
    try {
      const res = await receivablesApi.collectInstallmentPayment({
        customer,
        amount,
        method: 'cash',
      });
      setOverview(res.overview);
      setAmount('');
      setMessage(`${t('crm.collectionSaved')}: ${res.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const lines: InstallmentCollectionLine[] = overview?.lines ?? [];
  const monthlyDues = overview?.monthly_dues ?? [];

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<Banknote className="h-6 w-6" />}
        title={t('nav.installmentCollection')}
        description={t('crm.collectionDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </PageToolbar>
        }
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}

      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <select
            className="rounded-md border px-2 py-2 text-sm"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          >
            <option value="">{t('crm.selectCustomer')}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('crm.paidAmount')}
          />
          <Button onClick={collect} disabled={!customer || !amount}>
            {t('crm.collectNow')}
          </Button>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {t('crm.autoDistributeHint')}
        </p>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <h3 className="px-4 py-3 font-bold border-b bg-slate-50">{t('crm.monthlyDues')}</h3>
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('crm.dueMonth')}</th>
              <th className="px-3 py-2 text-start">{t('sales.customer')}</th>
              <th className="px-3 py-2 text-end">{t('crm.required')}</th>
              <th className="px-3 py-2 text-end">{t('crm.balance')}</th>
              <th className="px-3 py-2 text-center">{t('crm.invoicesCount')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-center">{t('inventory.loading')}</td></tr>
            ) : monthlyDues.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-500">{t('crm.noOpenInstallments')}</td></tr>
            ) : (
              monthlyDues.map((row) => (
                <tr key={row.month_key + row.customer_id} className="border-t">
                  <td className="px-3 py-2 font-semibold">{row.due_month_label}</td>
                  <td className="px-3 py-2">{row.customer_name}</td>
                  <td className="px-3 py-2 text-end">{fmtMoney(row.amount_due)}</td>
                  <td className="px-3 py-2 text-end font-bold text-red-700">{fmtMoney(row.balance)}</td>
                  <td className="px-3 py-2 text-center">{row.line_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <h3 className="px-4 py-3 font-bold border-b bg-slate-50">{t('crm.installmentDetails')}</h3>
        <table className="w-full text-sm min-w-[850px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('crm.installmentNo')}</th>
              <th className="px-3 py-2 text-start">{t('sales.customer')}</th>
              <th className="px-3 py-2 text-start">{t('crm.dueDate')}</th>
              <th className="px-3 py-2 text-end">{t('crm.required')}</th>
              <th className="px-3 py-2 text-end">{t('crm.paid')}</th>
              <th className="px-3 py-2 text-end">{t('crm.balance')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.status')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center">{t('inventory.loading')}</td></tr>
            ) : lines.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">{t('crm.noOpenInstallments')}</td></tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="px-3 py-2">{line.contract_code} / {line.sequence}</td>
                  <td className="px-3 py-2">{line.customer_name}</td>
                  <td className="px-3 py-2">{line.due_date}</td>
                  <td className="px-3 py-2 text-end">{fmtMoney(Number(line.amount_due) + Number(line.penalty_amount))}</td>
                  <td className="px-3 py-2 text-end">{fmtMoney(line.amount_paid)}</td>
                  <td className="px-3 py-2 text-end font-semibold">{fmtMoney(line.balance)}</td>
                  <td className="px-3 py-2">{line.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

