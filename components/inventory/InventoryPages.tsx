import { MasterDataPage } from './MasterDataPage';
import {
  brandsApi,
  classificationsApi,
  colorsApi,
  productSectionsApi,
  sizesApi,
} from '@/lib/api/inventory';

export function ProductSectionsPage() {
  return <MasterDataPage titleKey="nav.productSections" api={productSectionsApi} />;
}

export function BrandsPage() {
  return <MasterDataPage titleKey="nav.brands" api={brandsApi} />;
}

export function ClassificationsPage() {
  return <MasterDataPage titleKey="nav.classifications" api={classificationsApi} />;
}

export function SizesPage() {
  return <MasterDataPage titleKey="nav.sizes" api={sizesApi} />;
}

export function ColorsPage() {
  return (
    <MasterDataPage
      titleKey="nav.colors"
      api={colorsApi}
      extraFields={[{ key: 'hex_code', labelKey: 'inventory.hexCode' }]}
    />
  );
}

import { supplierGroupsApi, supplierTypesApi } from '@/lib/api/inventory';
import { ENTITY_KIND_OPTIONS, SETTLEMENT_MODE_OPTIONS } from '@/lib/suppliers/defaults';
import { SupplierCatalogMasterPage } from '@/components/suppliers/SupplierCatalogMasterPage';

export function SupplierTypesPage() {
  return (
    <SupplierCatalogMasterPage
      titleKey="nav.supplierTypes"
      hintKey="suppliers.typesListHint"
      api={supplierTypesApi}
      kindField="entity_kind"
      kindOptions={ENTITY_KIND_OPTIONS}
      kindColumnLabelKey="suppliers.entityKind"
    />
  );
}

export function SupplierGroupsPage() {
  return (
    <SupplierCatalogMasterPage
      titleKey="nav.supplierGroups"
      hintKey="suppliers.groupsListHint"
      api={supplierGroupsApi}
      kindField="settlement_mode"
      kindOptions={SETTLEMENT_MODE_OPTIONS}
      kindColumnLabelKey="suppliers.settlementMode"
    />
  );
}
