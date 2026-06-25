import { paymentTypesApi } from '@/lib/api/hr-payroll';
import { HrCatalogPage } from '@/components/hr/HrCatalogPage';

export function PaymentAuthTypesPage() {
  return (
    <HrCatalogPage
      activeTab="payment-auth-types"
      titleKey="hrPayroll.paymentTypes.title"
      descKey="hrPayroll.paymentTypes.desc"
      addKey="hrPayroll.paymentTypes.add"
      emptyKey="hrPayroll.paymentTypes.empty"
      load={() => paymentTypesApi.list()}
      create={(b) => paymentTypesApi.create(b)}
      update={(id, b) => paymentTypesApi.update(id, b)}
      remove={(id) => paymentTypesApi.remove(id)}
    />
  );
}
