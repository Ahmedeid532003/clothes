import { supplierCategoriesApi } from '@/lib/api/inventory';
import { SupplierSimpleCatalogPage } from '@/components/suppliers/SupplierSimpleCatalogPage';

export function SupplierCategoriesPage() {
  return (
    <SupplierSimpleCatalogPage
      titleKey="nav.supplierCategories"
      hintKey="suppliers.categoriesPageDesc"
      api={supplierCategoriesApi}
    />
  );
}
