import { supplierDepartmentsApi } from '@/lib/api/inventory';
import { SupplierSimpleCatalogPage } from '@/components/suppliers/SupplierSimpleCatalogPage';

export function SupplierDepartmentsPage() {
  return (
    <SupplierSimpleCatalogPage
      titleKey="nav.supplierDepartments"
      hintKey="suppliers.departmentsPageDesc"
      api={supplierDepartmentsApi}
    />
  );
}
