import { deductionItemsApi } from '@/lib/api/hr-payroll';
import { HrCatalogPage } from '@/components/hr/HrCatalogPage';

export function DeductionItemsPage() {
  return (
    <HrCatalogPage
      activeTab="deduction-items"
      titleKey="hrPayroll.deductionItems.title"
      descKey="hrPayroll.deductionItems.desc"
      addKey="hrPayroll.deductionItems.add"
      emptyKey="hrPayroll.deductionItems.empty"
      load={() => deductionItemsApi.list()}
      create={(b) => deductionItemsApi.create(b)}
      update={(id, b) => deductionItemsApi.update(id, b)}
      remove={(id) => deductionItemsApi.remove(id)}
    />
  );
}
