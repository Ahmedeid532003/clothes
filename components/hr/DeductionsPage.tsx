import { deductionItemsApi, deductionsApi } from '@/lib/api/hr-payroll';
import { HrEmployeeTxnPage } from '@/components/hr/HrEmployeeTxnPage';

export function DeductionsPage() {
  return (
    <HrEmployeeTxnPage
      activeTab="deductions"
      titleKey="hrPayroll.deductions.title"
      descKey="hrPayroll.deductions.desc"
      addKey="hrPayroll.deductions.add"
      emptyKey="hrPayroll.deductions.empty"
      dateField="deduction_date"
      itemField="deduction_item_id"
      itemNameField="deduction_item_name"
      loadItems={() => deductionItemsApi.list()}
      loadRows={() => deductionsApi.list()}
      createRow={(b) => deductionsApi.create(b)}
    />
  );
}
