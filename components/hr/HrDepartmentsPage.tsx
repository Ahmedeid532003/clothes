import { DepartmentsPage } from '@/components/dashboard/Departments';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';

export function HrDepartmentsPage() {
  return (
    <HrModuleLayout activeTab="departments">
      <DepartmentsPage />
    </HrModuleLayout>
  );
}
