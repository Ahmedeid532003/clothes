import { apiFetch } from './client';

export type CrmNotification = {
  level: string;
  message_ar: string;
  message_en: string;
  action?: string;
};

export type CrmDashboard = {
  kpis: {
    total_debt: string;
    collection_rate_percent: string;
    risky_customers_count: number;
    avg_collection_days: number;
    inactive_count: number;
    overdue_count: number;
    at_risk_count: number;
    followup_count: number;
    reminders_pending: number;
  };
  inactive_customers: CustomerInsightRow[];
  top_buyers: CustomerInsightRow[];
  overdue_customers: CustomerInsightRow[];
  at_risk_customers: CustomerInsightRow[];
  need_followup: CustomerInsightRow[];
  salesperson_kpis: SalespersonKpi[];
  notifications: CrmNotification[];
  aging: Record<string, string>;
};

export type CustomerInsightRow = {
  id: string;
  code: string;
  name_ar: string;
  phone?: string;
  whatsapp?: string;
  total_sales: string;
  balance_due: string;
  last_activity_at: string | null;
  salesperson_name: string | null;
  overdue_invoices: number;
  overdue_total: string;
  max_days_overdue: number;
  compliance_percent: string;
  churn_probability: number;
  risk_level: string;
  pending_followups?: number;
};

export type SalespersonKpi = {
  user_id: string;
  name: string;
  customers_count: number;
  total_sales: string;
  balance_due: string;
  overdue_customers: number;
};

export type ArrearsCustomerRow = {
  customer_id: string;
  customer_code: string;
  customer_name: string;
  overdue_invoices: number;
  overdue_total: string;
  max_days_overdue: number;
  last_payment: string | null;
  compliance_percent: string;
  salesperson_name: string | null;
  risk_level: string;
  aging_bucket: string;
  block_new_sales: boolean;
  churn_probability: number;
};

export type ArrearsReport = {
  invoices: Record<string, unknown>[];
  customers: ArrearsCustomerRow[];
  aging: Record<string, string>;
  dashboard: {
    total_debt: string;
    collection_rate_percent: string;
    risky_customers_count: number;
    avg_collection_days: number;
  };
};

export type InstallmentPlan = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  frequency: string;
  period_unit: 'days' | 'months';
  interval_days: number;
  default_num_installments: number;
  down_payment_percent: string;
  interest_base: string;
  interest_type: string;
  interest_rate_percent: string;
  interest_fixed_amount: string;
  auto_add_interest: boolean;
  penalty_rate_percent: string;
  penalty_fixed_amount: string;
  penalty_day_of_month: number;
  grace_days: number;
  first_due_after_days: number;
  show_interest_on_receipt: boolean;
  show_penalty_on_receipt: boolean;
  is_active: boolean;
};

export type InstallmentPlanPreview = {
  plan: InstallmentPlan;
  principal_amount: string;
  down_payment_amount: string;
  down_payment_percent: string;
  interest_amount: string;
  financed_amount: string;
  total_with_interest: string;
  installments_total: string;
  num_installments: number;
  installment_amount: string;
  schedule: Array<{
    sequence: number;
    due_date: string;
    due_month_label: string;
    amount: string;
    penalty_amount: string;
  }>;
};

export type InstallmentReceipt = {
  sale_code: string;
  contract_code: string;
  customer_name: string;
  items: Array<{ product_name: string; product_code: string; quantity: string; line_total: string }>;
  subtotal: string;
  discount_amount: string;
  interest_amount: string;
  show_interest_on_receipt: boolean;
  show_penalty_on_receipt: boolean;
  grand_total_label: string;
  grand_total: string;
  credit_from_invoice: string;
  previous_balance: string;
  down_payment_collected: string;
  current_balance: string;
  schedule: Array<{
    due_date: string;
    due_month_label: string;
    amount_due: string;
    penalty_amount?: string;
    total_amount: string;
  }>;
  total_installments_count: number;
  remaining_installments_total: string;
};

export type InstallmentLine = {
  id: string;
  sequence: number;
  due_date: string;
  effective_due_date?: string;
  deferred_to?: string | null;
  amount_due: string;
  amount_paid: string;
  penalty_amount: string;
  total_amount: string;
  balance: string;
  status: string;
  days_overdue: number;
  paid_at?: string | null;
  notes?: string;
};

export type InstallmentContract = {
  id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  principal_amount: string;
  down_payment_amount: string;
  interest_amount: string;
  financed_amount: string;
  total_contract_amount: string;
  num_installments: number;
  installment_amount: string;
  status: string;
  lines?: InstallmentLine[];
  totals?: { balance_due: string; total_paid: string; late_count: number };
};

export type InstallmentCollectionLine = InstallmentLine & {
  contract_id: string;
  contract_code: string;
  customer_id: string;
  customer_name: string;
};

export type InstallmentCollectionOverview = {
  lines: InstallmentCollectionLine[];
  monthly_dues: Array<{
    month_key: string;
    due_month_label: string;
    due_date: string;
    customer_id: string;
    customer_name: string;
    amount_due: string;
    amount_paid: string;
    balance: string;
    penalty_amount: string;
    line_count: number;
  }>;
  total_balance: string;
};

export const receivablesApi = {
  crmDashboard: () => apiFetch<CrmDashboard>('/inventory/customers/crm-dashboard/'),
  arrears: (params?: { salesperson?: string; bucket?: string }) => {
    const sp = new URLSearchParams();
    if (params?.salesperson) sp.set('salesperson', params.salesperson);
    if (params?.bucket) sp.set('bucket', params.bucket);
    const q = sp.toString();
    return apiFetch<ArrearsReport>(`/inventory/customers/arrears/${q ? `?${q}` : ''}`);
  },
  scheduleFollowUp: (payload: Record<string, unknown>) =>
    apiFetch('/inventory/customers/follow-ups/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  queueReminder: (payload: Record<string, unknown>) =>
    apiFetch<{ integration?: { whatsapp_url?: string; sms_preview?: string; email_preview?: string } }>(
      '/inventory/customers/reminders/',
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  runAutoReminders: () =>
    apiFetch<{ reminders_created: number }>('/inventory/customers/reminders/auto-run/', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  installmentPlans: (activeOnly?: boolean) => {
    const base = '/inventory/installment-plans/';
    return apiFetch<InstallmentPlan[]>(activeOnly ? `${base}?active=1` : base);
  },
  installmentPlan: (id: string) =>
    apiFetch<InstallmentPlan>(`/inventory/installment-plans/${id}/`),
  createInstallmentPlan: (payload: Record<string, unknown>) =>
    apiFetch<InstallmentPlan>('/inventory/installment-plans/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateInstallmentPlan: (id: string, payload: Record<string, unknown>) =>
    apiFetch<InstallmentPlan>(`/inventory/installment-plans/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  previewInstallmentPlan: (params: {
    plan: string;
    principal: string;
    down_payment?: string;
    num_installments?: number;
  }) => {
    const sp = new URLSearchParams({ plan: params.plan, principal: params.principal });
    if (params.down_payment) sp.set('down_payment', params.down_payment);
    if (params.num_installments) sp.set('num_installments', String(params.num_installments));
    return apiFetch<InstallmentPlanPreview>(`/inventory/installment-plans/preview/?${sp}`);
  },
  installmentContracts: (customer?: string) => {
    const q = customer ? `?customer=${customer}` : '';
    return apiFetch<InstallmentContract[]>(`/inventory/installment-contracts/${q}`);
  },
  installmentContract: (id: string) =>
    apiFetch<InstallmentContract>(`/inventory/installment-contracts/${id}/`),
  createContract: (payload: Record<string, unknown>) =>
    apiFetch<InstallmentContract>('/inventory/installment-contracts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  contractAction: (id: string, payload: Record<string, unknown>) =>
    apiFetch<InstallmentContract>(`/inventory/installment-contracts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  restructureContract: (
    id: string,
    payload: { expected_total: string; lines: { id?: string; due_date: string; balance: string }[] },
  ) =>
    apiFetch<InstallmentContract>(`/inventory/installment-contracts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'restructure', ...payload }),
    }),
  lineAction: (id: string, payload: Record<string, unknown>) =>
    apiFetch<InstallmentContract>(`/inventory/installment-lines/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  mergeLines: (lineIds: string[]) =>
    apiFetch<InstallmentContract>('/inventory/installment-lines/merge/', {
      method: 'POST',
      body: JSON.stringify({ line_ids: lineIds }),
    }),
  installmentReports: () =>
    apiFetch<{
      due_installments: InstallmentLine[];
      overdue_installments: InstallmentLine[];
      expected_cashflow: { month: string; amount: string }[];
      expected_collection: string;
    }>('/inventory/installment-contracts/reports/'),
  installmentCollection: (customer?: string, includePaid?: boolean) => {
    const sp = new URLSearchParams();
    if (customer) sp.set('customer', customer);
    if (includePaid) sp.set('include_paid', '1');
    const q = sp.toString();
    return apiFetch<InstallmentCollectionOverview>(`/inventory/installment-collection/${q ? `?${q}` : ''}`);
  },
  collectInstallmentPayment: (payload: Record<string, unknown>) =>
    apiFetch<{
      payment_id: string;
      code: string;
      amount: string;
      unallocated: string;
      allocations: Record<string, unknown>[];
      overview: InstallmentCollectionOverview;
    }>('/inventory/installment-collection/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
