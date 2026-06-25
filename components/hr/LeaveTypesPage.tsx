import { leaveTypesApi } from '@/lib/api/hr-payroll';
import { HrCatalogPage } from '@/components/hr/HrCatalogPage';

export function LeaveTypesPage() {
  return (
    <HrCatalogPage
      activeTab="leave-types"
      titleKey="hrPayroll.leaveTypes.title"
      descKey="hrPayroll.leaveTypes.desc"
      addKey="hrPayroll.leaveTypes.add"
      emptyKey="hrPayroll.leaveTypes.empty"
      load={() => leaveTypesApi.list()}
      create={(b) => leaveTypesApi.create(b)}
      update={(id, b) => leaveTypesApi.update(id, b)}
      remove={(id) => leaveTypesApi.remove(id)}
    />
  );
}
