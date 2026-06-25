import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { EmployeeReportsView } from '@/components/hr/employee-reports/EmployeeReportsView';

export function EmployeeReportsPage() {
  return (
    <HrModuleLayout activeTab="employee-reports">
      <div className="emp-rep-page-wrap">
        <EmployeeReportsView />
      </div>
    </HrModuleLayout>
  );
}
