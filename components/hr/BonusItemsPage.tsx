import { bonusItemsApi } from '@/lib/api/hr-payroll';
import { HrCatalogPage } from '@/components/hr/HrCatalogPage';

export function BonusItemsPage() {
  return (
    <HrCatalogPage
      activeTab="bonus-items"
      titleKey="hrPayroll.bonusItems.title"
      descKey="hrPayroll.bonusItems.desc"
      addKey="hrPayroll.bonusItems.add"
      emptyKey="hrPayroll.bonusItems.empty"
      load={() => bonusItemsApi.list()}
      create={(b) => bonusItemsApi.create(b)}
      update={(id, b) => bonusItemsApi.update(id, b)}
      remove={(id) => bonusItemsApi.remove(id)}
    />
  );
}
