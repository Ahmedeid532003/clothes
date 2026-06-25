import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { EmployeeCommissionsReportView } from '@/components/hr/commissions/EmployeeCommissionsReportView';

export function CommissionsPage() {
  return (
    <HrModuleLayout activeTab="employee-commissions">
      <div className="emp-comm-page-wrap">
        <EmployeeCommissionsReportView />
      </div>
    </HrModuleLayout>
  );
}
