import { useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { appNavigate } from '@/components/accounting/AccountingUi';
import { navigateToPaymentCheques } from '@/lib/payment-papers';

/** يوجّه لشاشة متابعة الدفع والشيكات الموحّدة داخل المصروفات. */
export function ChequesPage() {
  const { t } = useLanguage();

  useEffect(() => {
    navigateToPaymentCheques();
  }, []);

  return (
    <div className="py-16 text-center text-sm text-slate-500">
      {t('paymentCheques.redirecting')}
      <button type="button" className="block mx-auto mt-3 text-blue-700 font-bold underline" onClick={() => appNavigate('payment-cheques')}>
        {t('nav.paymentCheques')}
      </button>
    </div>
  );
}
