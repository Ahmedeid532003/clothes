import { allowanceItemsApi } from '@/lib/api/hr-payroll';
import { HrCatalogPage } from '@/components/hr/HrCatalogPage';

export function AllowanceItemsPage() {
  return (
    <HrCatalogPage
      activeTab="allowance-items"
      titleKey="hrPayroll.allowanceItems.title"
      descKey="hrPayroll.allowanceItems.desc"
      addKey="hrPayroll.allowanceItems.add"
      emptyKey="hrPayroll.allowanceItems.empty"
      load={() => allowanceItemsApi.list()}
      create={(b) => allowanceItemsApi.create(b)}
      update={(id, b) => allowanceItemsApi.update(id, b)}
      remove={(id) => allowanceItemsApi.remove(id)}
    />
  );
}
