import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { PayrollStatementsPage } from '@/components/hr/payroll-statements/PayrollStatementsPage';

export function PayrollSheetPage() {
  return (
    <HrModuleLayout activeTab="payroll">
      <div className="pay-stmt-page-wrap">
        <PayrollStatementsPage />
      </div>
    </HrModuleLayout>
  );
}
