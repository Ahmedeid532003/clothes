import React, { useEffect, useMemo, useState } from 'react';
import { UserCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { customersApi, type CustomerDto } from '@/lib/api/customers';
import { CustomerAccountStatementReport } from '@/components/customers/CustomerAccountStatementReport';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

export function CustomerAccountStatementPage() {
  const { t, isRtl } = useLanguage();
  const st = (k: string) => t(`crm.customerStatement.${k}` as never);

  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [customerId, setCustomerId] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  useEffect(() => {
    customersApi.list().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  return (
    <div className="customer-statement-page space-y-3 p-1 print:p-0" dir={isRtl ? 'rtl' : 'ltr'}>
      <style>{`
        @media print {
          .customer-statement-page .no-print { display: none !important; }
          .customer-statement-page { padding: 0; }
        }
      `}</style>

      <div className="no-print rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-sm p-4 space-y-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-violet-700" />
            {st('title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{st('periodFilterHint')}</p>
        </div>
        <div className="min-w-[220px]">
          <label className="text-xs text-slate-500 block mb-0.5">{t('crm.selectCustomer')}</label>
          <select
            className={ERP_NATIVE_SELECT}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">{t('crm.selectCustomer')}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!customerId ? (
        <p className="text-sm text-slate-500">{st('selectCustomerFirst')}</p>
      ) : (
        <CustomerAccountStatementReport
          customerId={customerId}
          customerName={selectedCustomer?.name_ar}
          autoLoad
        />
      )}
    </div>
  );
}
