export const CUSTOMER_TYPE_SLUGS = [
  { key: 'establishment', labelAr: 'منشأة', labelEn: 'Establishment' },
  { key: 'shop', labelAr: 'محل', labelEn: 'Shop' },
  { key: 'individual', labelAr: 'فرد', labelEn: 'Individual' },
] as const;

export const VISIBILITY_ROLES = [
  { key: 'owner', labelAr: 'المالك', labelEn: 'Owner' },
  { key: 'manager', labelAr: 'مدير', labelEn: 'Manager' },
  { key: 'sales', labelAr: 'مبيعات', labelEn: 'Sales' },
  { key: 'accountant', labelAr: 'محاسب', labelEn: 'Accountant' },
] as const;

export const FIELD_CATALOG_KEYS = [
  'company_name',
  'commercial_register',
  'tax_id',
  'legal_representative',
  'shop_name',
  'owner_name',
  'license_number',
  'national_id',
  'phone',
  'whatsapp',
  'email',
  'address',
  'notes',
] as const;
