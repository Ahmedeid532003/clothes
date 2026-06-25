import { employeeGroupsApi } from '@/lib/api/employee-groups';
import { HrCatalogPage } from '@/components/hr/HrCatalogPage';

export function EmployeeGroupsPage() {
  return (
    <HrCatalogPage
      activeTab="employee-groups"
      titleKey="employeeGroups.title"
      descKey="employeeGroups.desc"
      addKey="employeeGroups.add"
      emptyKey="employeeGroups.empty"
      showDescription
      load={() => employeeGroupsApi.list()}
      create={(b) => employeeGroupsApi.create(b)}
      update={(id, b) => employeeGroupsApi.update(id, b)}
      remove={(id) => employeeGroupsApi.remove(id)}
    />
  );
}
