import { apiFetch } from './client';

export type CustomerFormField = {
  key: string;
  type: string;
  label_ar: string;
  label_en: string;
  section?: string;
};

export type WorkflowStep = {
  key: string;
  label_ar: string;
  label_en: string;
};

export type CustomerTypeDto = {
  id: string;
  code: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
  mandatory_fields: string[];
  field_visibility: Record<string, string[]>;
  workflow_steps: WorkflowStep[];
  form_schema: CustomerFormField[];
  customers_count: number;
};

export type CustomerGroupDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent: string | null;
  parent_name: string | null;
  level: number;
  tree_path: string;
  path_label: string;
  default_discount_percent: string;
  default_payment_policy: string;
  default_credit_limit: string;
  region: string;
  salesperson: string | null;
  salesperson_name: string | null;
  risk_level: string;
  volume_tier: string;
  notes: string;
  display_color: string;
  is_system: boolean;
  is_active: boolean;
  children_count: number;
  stats?: GroupStats;
};

export type GroupStats = {
  customers_count: number;
  total_sales: string;
  balance_due: string;
  avg_collection_percent: string;
  activity_rate_percent: string;
  active_last_30_days: number;
};

export type CustomerActivity = {
  id: string;
  action: string;
  summary: string;
  created_at: string;
  user_name: string | null;
};

export type DuplicateWarning = {
  field: string;
  customer_id: string;
  customer_code: string;
  customer_name: string;
  message: string;
};

export type CustomerDto = {
  id: string;
  code: string;
  customer_type: string;
  customer_type_slug: string;
  customer_type_name: string;
  customer_group: string;
  customer_group_name: string;
  customer_group_path: string;
  customer_group_color?: string;
  name_ar: string;
  name_en: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  workflow_status: string;
  profile_data: Record<string, string | number | boolean>;
  national_id?: string;
  governorate?: string;
  city?: string;
  district?: string;
  gps_lat?: string | null;
  gps_lng?: string | null;
  barcode?: string;
  credit_score?: number;
  purchase_count?: number;
  avg_purchase_amount?: string;
  is_stopped?: boolean;
  stop_reason?: string;
  uses_consignment?: boolean;
  route_line?: string;
  customer_rating?: number;
  credit_limit: string;
  discount_percent: string;
  payment_policy: string;
  balance_due: string;
  total_sales: string;
  total_collected: string;
  last_activity_at: string | null;
  assigned_salesperson: string | null;
  assigned_salesperson_name: string | null;
  notes: string;
  is_active: boolean;
  spouse_name?: string;
  guarantor_summary?: string;
  phone_verified?: boolean;
  form_schema: CustomerFormField[];
  workflow_steps: WorkflowStep[];
  mandatory_fields: string[];
  activities?: CustomerActivity[];
};

export type CustomerMeta = {
  types: CustomerTypeDto[];
  groups: CustomerGroupDto[];
  field_catalog: Record<string, { type: string; label_ar: string; label_en: string }>;
  default_workflow: WorkflowStep[];
  default_visibility: Record<string, string[]>;
  payment_policies: { key: string; label_ar: string }[];
  risk_levels: { key: string; label_ar: string }[];
  volume_tiers: { key: string; label_ar: string }[];
};

export type GroupsDashboard = {
  groups: CustomerGroupDto[];
  totals: {
    customers_count: number;
    total_sales: string;
    balance_due: string;
  };
};

export async function fetchCustomerMeta() {
  return apiFetch<CustomerMeta>('/inventory/customers/meta/');
}

export const customerTypesApi = {
  list: (includeInactive?: boolean) =>
    apiFetch<CustomerTypeDto[]>(
      `/inventory/customer-types/${includeInactive ? '?include_inactive=1' : ''}`,
    ),
  create: (payload: Record<string, unknown>) =>
    apiFetch<CustomerTypeDto>('/inventory/customer-types/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<CustomerTypeDto>(`/inventory/customer-types/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/inventory/customer-types/${id}/`, { method: 'DELETE' }),
};

export const customerGroupsApi = {
  list: () => apiFetch<CustomerGroupDto[]>('/inventory/customer-groups/'),
  dashboard: () => apiFetch<GroupsDashboard>('/inventory/customer-groups/dashboard/'),
  create: (payload: Record<string, unknown>) =>
    apiFetch<CustomerGroupDto>('/inventory/customer-groups/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<CustomerGroupDto>(`/inventory/customer-groups/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/inventory/customer-groups/${id}/`, { method: 'DELETE' }),
};

export const customersApi = {
  nextCode: () => apiFetch<{ code: string }>('/inventory/customers/next-code/'),
  checkDuplicate: (params: { phone?: string; national_id?: string; exclude?: string }) => {
    const sp = new URLSearchParams();
    if (params.phone) sp.set('phone', params.phone);
    if (params.national_id) sp.set('national_id', params.national_id);
    if (params.exclude) sp.set('exclude', params.exclude);
    return apiFetch<{ has_duplicate: boolean; warnings: DuplicateWarning[] }>(
      `/inventory/customers/check-duplicate/?${sp}`,
    );
  },
  get: (id: string) => apiFetch<CustomerDto>(`/inventory/customers/${id}/`),
  list: (params?: { group?: string; type?: string }) => {
    const sp = new URLSearchParams();
    if (params?.group) sp.set('group', params.group);
    if (params?.type) sp.set('type', params.type);
    const q = sp.toString();
    return apiFetch<CustomerDto[]>(`/inventory/customers/${q ? `?${q}` : ''}`);
  },
  create: (payload: Record<string, unknown>) =>
    apiFetch<CustomerDto>('/inventory/customers/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<CustomerDto>(`/inventory/customers/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/inventory/customers/${id}/`, { method: 'DELETE' }),
  purchaseItems: (id: string) =>
    apiFetch<CustomerPurchaseItem[]>(`/inventory/customers/${id}/purchase-items/`),
};

export type CustomerPurchaseItem = {
  sale_id: string;
  sale_code: string;
  sale_date: string;
  product_code: string;
  product_name: string;
  size_name: string;
  color_name: string;
  quantity: string;
  unit_price: string;
  line_total: string;
};

export type CustomerStatementRow = {
  id: string;
  date: string;
  document_code: string;
  season_id: string;
  season_name: string;
  transaction_type: string;
  transaction_label: string;
  payment_system: string;
  sales_amount: string;
  sales_interest: string;
  sales_total: string;
  returns_amount: string;
  returns_interest: string;
  returns_total: string;
  payment_reservation: string;
  payment_down: string;
  payment_installments: string;
  debit: string;
  credit: string;
  balance: string;
  notes: string;
  source_type: string;
  source_id: string;
  navigate_tab: string;
  highlight: boolean;
};

export type CustomerAccountStatement = {
  view: 'detailed' | 'general';
  customer: { id: string; code: string; name_ar: string };
  rows: CustomerStatementRow[];
  count: number;
  summary: {
    columns: Record<string, string>;
    total_sales: string;
    total_returns: string;
    net_sold: string;
    total_payments: string;
    cash_refunds: string;
    net_payments: string;
    closing_balance: string;
    closing_debit: string;
    closing_credit: string;
    balance_label: string;
  };
};

export async function fetchCustomerAccountStatement(params: {
  customer: string;
  from?: string;
  to?: string;
  view?: 'detailed' | 'general';
}): Promise<CustomerAccountStatement> {
  const sp = new URLSearchParams();
  sp.set('customer', params.customer);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.view) sp.set('view', params.view);
  return apiFetch(`/inventory/customers/account-statement/?${sp.toString()}`);
}
