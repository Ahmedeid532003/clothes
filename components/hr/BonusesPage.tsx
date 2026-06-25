import { bonusItemsApi, bonusesApi } from '@/lib/api/hr-payroll';
import { HrEmployeeTxnPage } from '@/components/hr/HrEmployeeTxnPage';

export function BonusesPage() {
  return (
    <HrEmployeeTxnPage
      activeTab="bonuses"
      titleKey="hrPayroll.bonuses.title"
      descKey="hrPayroll.bonuses.desc"
      addKey="hrPayroll.bonuses.add"
      emptyKey="hrPayroll.bonuses.empty"
      dateField="bonus_date"
      itemField="bonus_item_id"
      itemNameField="bonus_item_name"
      loadItems={() => bonusItemsApi.list()}
      loadRows={() => bonusesApi.list()}
      createRow={(b) => bonusesApi.create(b)}
    />
  );
}
