import { apiFetch, apiFetchFormData } from './client';

export type ExpenseTypeDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent: string | null;
  parent_code: string | null;
  parent_name: string | null;
  code_segment: string;
  level: number;
  tree_path: string;
  path_label: string;
  gl_account: string | null;
  gl_account_code: string | null;
  gl_account_name: string | null;
  cost_center: string | null;
  cost_center_code: string | null;
  cost_center_name: string | null;
  branch: string | null;
  branch_name: string | null;
  department: string | null;
  department_name: string | null;
  notes: string;
  is_active: boolean;
  children_count: number;
};

export type GlAccountDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  account_type: string;
  parent: string | null;
};

export type CostCenterDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  branch: string | null;
  branch_name: string | null;
};

export type ExpenseTypePayload = {
  name_ar: string;
  name_en?: string;
  parent?: string | null;
  code?: string;
  code_segment?: string;
  gl_account?: string | null;
  cost_center?: string | null;
  branch?: string | null;
  department?: string | null;
  notes?: string;
};

export const expenseTypesApi = {
  list: () => apiFetch<ExpenseTypeDto[]>('/accounting/expense-types/'),
  create: (payload: ExpenseTypePayload) =>
    apiFetch<ExpenseTypeDto>('/accounting/expense-types/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<ExpenseTypePayload>) =>
    apiFetch<ExpenseTypeDto>(`/accounting/expense-types/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/accounting/expense-types/${id}/`, { method: 'DELETE' }),
  nextCode: (params: { parent?: string; code_segment?: string; name_ar?: string }) => {
    const sp = new URLSearchParams();
    if (params.parent) sp.set('parent', params.parent);
    if (params.code_segment) sp.set('code_segment', params.code_segment);
    if (params.name_ar) sp.set('name_ar', params.name_ar);
    const q = sp.toString();
    return apiFetch<{ code: string }>(
      `/accounting/expense-types/next-code/${q ? `?${q}` : ''}`,
    );
  },
};

export const glAccountsApi = {
  list: () => apiFetch<GlAccountDto[]>('/accounting/gl-accounts/'),
};

export const costCentersApi = {
  list: () => apiFetch<CostCenterDto[]>('/accounting/cost-centers/'),
};

export type TreasuryDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  kind: string;
  gl_account: string;
  gl_account_code: string;
  branch: string | null;
  branch_name: string | null;
};

export type ExpenseVoucherDto = {
  id: string;
  code: string;
  voucher_date: string;
  expense_type: string;
  expense_type_code: string;
  expense_type_name: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  payment_method: string;
  treasury: string;
  treasury_name: string;
  branch: string | null;
  branch_name: string | null;
  cost_center: string | null;
  cost_center_name: string | null;
  beneficiary: string;
  supplier: string | null;
  supplier_name: string | null;
  responsible: string | null;
  responsible_name: string | null;
  status: string;
  requires_manager_review: boolean;
  notes: string;
  journal_code: string | null;
  attachments: { id: string; name: string; url: string }[];
};

export type ExpenseVoucherPayload = {
  voucher_date: string;
  expense_type: string;
  amount: string;
  tax_amount?: string;
  payment_method?: string;
  treasury: string;
  branch?: string | null;
  cost_center?: string | null;
  beneficiary?: string;
  supplier?: string | null;
  responsible?: string | null;
  notes?: string;
  approve?: boolean;
  post?: boolean;
};

export type CashShiftDto = {
  id: string;
  code: string;
  employee: string;
  employee_name: string;
  branch: string;
  branch_name: string;
  treasury: string;
  treasury_name: string;
  status: string;
  opened_at: string | null;
  closed_at: string | null;
  opening_balance: string;
  expected_balance: string;
  actual_balance: string | null;
  difference: string;
  notes: string;
  approved_at: string | null;
  handover_status?: string;
  closed_by_name?: string;
  approved_by_name?: string;
  movement_summary?: Record<string, string>;
  handover_receipt_code?: string;
  received_by_name?: string;
  received_at?: string | null;
  received_treasury_name?: string;
  employee_pending_balance?: string;
  sales_total?: string;
  sales_credit?: string;
  sales_cash?: string;
  customer_returns?: string;
  down_payment_refunds?: string;
  installment_collections?: string;
  total_cash_shift?: string;
  general_expenses?: string;
  supplier_payments?: string;
  wages?: string;
  book_revenue?: string;
  movements?: {
    id: string;
    movement_type: string;
    amount: string;
    reference: string;
    notes: string;
    created_at: string | null;
  }[];
};

export type CashierDailyReportLine = { name: string; amount: string };

export type CashierDailyReportDto = {
  shift_id: string;
  shift_code: string;
  employee_name: string;
  branch_name: string;
  treasury_name: string;
  opened_at: string | null;
  closed_at: string | null;
  opening_balance?: string;
  expected_balance?: string;
  sales: { total: string; credit: string; cash_and_down: string };
  adjustments: {
    customer_returns: string;
    down_payment_refunds: string;
    installment_collections: string;
  };
  total_cash_shift: string;
  general_expenses: { total: string; items: CashierDailyReportLine[] };
  supplier_payments: { total: string; items: CashierDailyReportLine[] };
  wages: { total: string; items: CashierDailyReportLine[] };
  net_cash: string;
};

export const treasuriesApi = {
  list: () => apiFetch<TreasuryDto[]>('/accounting/treasuries/'),
};

export const expenseVouchersApi = {
  list: (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch<ExpenseVoucherDto[]>(`/accounting/expense-vouchers/${q}`);
  },
  create: (payload: ExpenseVoucherPayload, files?: File[]) =>
    expenseVoucherForm('/accounting/expense-vouchers/', payload, files),
  update: (id: string, payload: Partial<ExpenseVoucherPayload>, files?: File[]) =>
    expenseVoucherForm(`/accounting/expense-vouchers/${id}/`, payload, files, 'PATCH'),
  approve: (id: string) =>
    apiFetch<ExpenseVoucherDto>(`/accounting/expense-vouchers/${id}/approve/`, { method: 'POST' }),
  post: (id: string) =>
    apiFetch<ExpenseVoucherDto>(`/accounting/expense-vouchers/${id}/post/`, { method: 'POST' }),
  cancel: (id: string) =>
    apiFetch<ExpenseVoucherDto>(`/accounting/expense-vouchers/${id}/cancel/`, { method: 'POST' }),
};

async function expenseVoucherForm(
  path: string,
  payload: Partial<ExpenseVoucherPayload>,
  files?: File[],
  method = 'POST',
) {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
  });
  files?.forEach((f) => fd.append('attachments', f));
  return apiFetchFormData<ExpenseVoucherDto>(path, fd, method);
}

export type ActiveShiftUser = {
  shift_id: string;
  shift_code: string;
  employee_id: string;
  employee_name: string;
  branch_name: string;
  treasury_name: string;
  opened_at: string | null;
  expected_balance: string;
};

export type PosShiftGate = {
  required: boolean;
  open_shift: CashShiftDto | null;
};

export type CashShiftListParams = {
  status?: string;
  branch?: string;
  employee?: string;
  handover_status?: string;
  q?: string;
};

export const cashShiftsApi = {
  list: (params?: CashShiftListParams) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.branch) sp.set('branch', params.branch);
    if (params?.employee) sp.set('employee', params.employee);
    if (params?.handover_status) sp.set('handover_status', params.handover_status);
    if (params?.q) sp.set('q', params.q);
    const q = sp.toString();
    return apiFetch<CashShiftDto[]>(`/accounting/cash-shifts/${q ? `?${q}` : ''}`);
  },
  activeUsers: () => apiFetch<ActiveShiftUser[]>('/accounting/cash-shifts/active/'),
  posGate: () => apiFetch<PosShiftGate>('/accounting/cash-shifts/pos-gate/'),
  myOpen: () => apiFetch<CashShiftDto | null>('/accounting/cash-shifts/my-open/'),
  detail: (id: string) => apiFetch<CashShiftDto>(`/accounting/cash-shifts/${id}/`),
  dailyReport: (id: string) =>
    apiFetch<CashierDailyReportDto>(`/accounting/cash-shifts/${id}/daily-report/`),
  open: (payload: { branch: string; treasury: string; opening_balance: string }) =>
    apiFetch<CashShiftDto>('/accounting/cash-shifts/open/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  close: (id: string, payload: { actual_balance: string; notes?: string }) =>
    apiFetch<CashShiftDto>(`/accounting/cash-shifts/${id}/close/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  approve: (id: string) =>
    apiFetch<CashShiftDto>(`/accounting/cash-shifts/${id}/approve/`, { method: 'POST' }),
  receive: (id: string, payload?: { target_treasury?: string }) =>
    apiFetch<CashShiftDto>(`/accounting/cash-shifts/${id}/receive/`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),
};

export type EnterpriseCashDashboard = {
  total_balance: string;
  open_shifts_count: number;
  pending_shifts_count: number;
  open_treasuries_count: number;
  pending_treasuries_count: number;
  pending_shifts_amount: string;
  treasuries: (TreasuryBalanceDto & {
    open_shifts?: number;
    pending_amount?: string;
    has_open_shift?: boolean;
    has_pending_handover?: boolean;
  })[];
  user_balances: { employee_id: string; employee_name: string; pending_balance: string }[];
  active_shift_rows: {
    shift_id: string;
    shift_code: string;
    employee_name: string;
    branch_name: string;
    treasury_name: string;
    status: string;
    handover_status: string;
    amount: string;
    opened_at: string | null;
    closed_at: string | null;
    received_by_name?: string;
    received_treasury_name?: string;
    handover_receipt_code?: string;
    received_at?: string | null;
  }[];
};

export const enterpriseCashApi = {
  dashboard: () => apiFetch<EnterpriseCashDashboard>('/accounting/enterprise-cash/'),
};

export type ShiftHandoverDto = {
  id: string;
  code: string;
  from_shift: string;
  from_shift_code: string;
  to_shift: string | null;
  from_employee: string;
  from_employee_name: string;
  to_employee: string;
  to_employee_name: string;
  treasury_name: string;
  branch_name: string;
  expected_balance: string;
  actual_balance: string | null;
  received_balance: string | null;
  difference: string;
  difference_reason: string;
  status: string;
  requires_review: boolean;
  sender_signed_at: string | null;
  receiver_signed_at: string | null;
};

export type TreasuryBalanceDto = {
  id: string;
  code: string;
  name_ar: string;
  kind: string;
  balance: string;
  currency: string;
};

export type TreasuryMovementDto = {
  id: string;
  code: string;
  movement_date: string;
  movement_type: string;
  treasury_name: string;
  counter_treasury_name: string | null;
  amount: string;
  currency: string;
  status: string;
  balance_after: string | null;
  notes: string;
  created_by_name: string | null;
};

export type PendingShiftsDashboard = {
  counts: Record<string, number>;
  pending_handovers: number;
  block_new_shift: boolean;
  notifications: { level: string; message_ar: string; message_en: string }[];
  items: {
    id: string;
    code: string;
    employee_name: string;
    issue: string;
    severity: string;
    difference: string;
    status: string;
    handover_status: string;
  }[];
};

export const shiftHandoversApi = {
  list: (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch<ShiftHandoverDto[]>(`/accounting/shift-handovers/${q}`);
  },
  detail: (id: string) => apiFetch<ShiftHandoverDto>(`/accounting/shift-handovers/${id}/`),
  create: (payload: { from_shift: string; to_employee: string; difference_reason?: string }) =>
    apiFetch<ShiftHandoverDto>('/accounting/shift-handovers/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  signSender: (id: string) =>
    apiFetch<ShiftHandoverDto>(`/accounting/shift-handovers/${id}/sign-sender/`, { method: 'POST' }),
  receive: (id: string, payload: { received_balance: string; difference_reason?: string }) =>
    apiFetch<ShiftHandoverDto>(`/accounting/shift-handovers/${id}/receive/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  approve: (id: string) =>
    apiFetch<ShiftHandoverDto>(`/accounting/shift-handovers/${id}/approve/`, { method: 'POST' }),
  complete: (id: string) =>
    apiFetch<ShiftHandoverDto>(`/accounting/shift-handovers/${id}/complete/`, { method: 'POST' }),
};

export const treasuryLiquidityApi = {
  balances: () => apiFetch<TreasuryBalanceDto[]>('/accounting/treasury-balances/'),
  movements: (params?: { status?: string; treasury?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.treasury) sp.set('treasury', params.treasury);
    const q = sp.toString();
    return apiFetch<TreasuryMovementDto[]>(`/accounting/treasury-movements/${q ? `?${q}` : ''}`);
  },
  create: (payload: Record<string, unknown>) =>
    apiFetch<TreasuryMovementDto>('/accounting/treasury-movements/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  post: (id: string) =>
    apiFetch<TreasuryMovementDto>(`/accounting/treasury-movements/${id}/post/`, { method: 'POST' }),
  audit: () =>
    apiFetch<
      { id: string; action: string; entity_code: string; user_name: string; created_at: string }[]
    >('/accounting/treasury-audit/'),
};

export const pendingShiftsApi = {
  dashboard: () => apiFetch<PendingShiftsDashboard>('/accounting/pending-shifts/'),
  forceApprove: (shiftId: string) =>
    apiFetch<CashShiftDto>(`/accounting/pending-shifts/${shiftId}/force-approve/`, {
      method: 'POST',
    }),
};

export type ChartAccountDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  account_type: string;
  parent: string | null;
  parent_code: string | null;
  parent_name: string | null;
  code_segment: string;
  level: number;
  tree_path: string;
  path_label: string;
  cost_center: string | null;
  cost_center_name: string | null;
  branch: string | null;
  branch_name: string | null;
  is_system: boolean;
  is_active: boolean;
  has_movements: boolean;
  children_count: number;
};

export type CurrencyDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  rate_to_base: string;
  is_base: boolean;
  is_active: boolean;
  display_rate: string;
};

export type FixedAssetDto = {
  id: string;
  code: string;
  name_ar: string;
  category: string;
  acquisition_date: string;
  cost: string;
  useful_life_months: number;
  depreciation_method: string;
  depreciation_rate: string;
  accumulated_depreciation: string;
  book_value: string;
  monthly_depreciation: string;
  gl_asset_code: string;
  gl_accumulated_code: string;
  gl_expense_code: string;
  status: string;
};

export const chartOfAccountsApi = {
  list: (accountType?: string) => {
    const q = accountType ? `?account_type=${encodeURIComponent(accountType)}` : '';
    return apiFetch<ChartAccountDto[]>(`/accounting/chart-of-accounts/${q}`);
  },
  create: (payload: Record<string, unknown>) =>
    apiFetch<ChartAccountDto>('/accounting/chart-of-accounts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<ChartAccountDto>(`/accounting/chart-of-accounts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/accounting/chart-of-accounts/${id}/`, { method: 'DELETE' }),
  nextCode: (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    return apiFetch<{ code: string }>(`/accounting/chart-of-accounts/next-code/?${sp}`);
  },
};

export const currenciesApi = {
  list: () => apiFetch<CurrencyDto[]>('/accounting/currencies/'),
  create: (payload: Record<string, unknown>) =>
    apiFetch<CurrencyDto>('/accounting/currencies/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<CurrencyDto>(`/accounting/currencies/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  convert: (amount: string, currency: string) =>
    apiFetch<{
      original_amount: string;
      base_amount: string;
      rate: string;
      base_currency: string;
    }>('/accounting/currencies/convert/', {
      method: 'POST',
      body: JSON.stringify({ amount, currency }),
    }),
};

export type JournalEntryDto = {
  id: string;
  code: string;
  entry_date: string;
  description: string;
  status: string;
  entry_kind: string;
  total_debit: string;
  total_credit: string;
  is_balanced: boolean;
  lines: {
    id: string;
    gl_account: string;
    gl_account_code: string;
    gl_account_name: string;
    debit: string;
    credit: string;
    memo: string;
  }[];
};

export const journalEntriesApi = {
  list: (params?: { status?: string; from_date?: string; to_date?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.from_date) sp.set('from_date', params.from_date);
    if (params?.to_date) sp.set('to_date', params.to_date);
    const q = sp.toString();
    return apiFetch<JournalEntryDto[]>(`/accounting/journal-entries/${q ? `?${q}` : ''}`);
  },
  detail: (id: string) => apiFetch<JournalEntryDto>(`/accounting/journal-entries/${id}/`),
  create: (payload: Record<string, unknown>) =>
    apiFetch<JournalEntryDto>('/accounting/journal-entries/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<JournalEntryDto>(`/accounting/journal-entries/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/accounting/journal-entries/${id}/`, { method: 'DELETE' }),
  approve: (id: string) =>
    apiFetch<JournalEntryDto>(`/accounting/journal-entries/${id}/approve/`, { method: 'POST' }),
  post: (id: string) =>
    apiFetch<JournalEntryDto>(`/accounting/journal-entries/${id}/post/`, { method: 'POST' }),
};

function reportQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  return sp.toString();
}

export const financialReportsApi = {
  trialBalance: (params: { as_of?: string; from_date?: string; to_date?: string; branch?: string }) =>
    apiFetch<Record<string, unknown>>(
      `/accounting/reports/trial-balance/?${reportQuery(params)}`,
    ),
  balanceSheet: (params: { as_of?: string; branch?: string }) =>
    apiFetch<Record<string, unknown>>(
      `/accounting/reports/balance-sheet/?${reportQuery(params)}`,
    ),
  incomeStatement: (params: { from_date?: string; to_date?: string; branch?: string }) =>
    apiFetch<Record<string, unknown>>(
      `/accounting/reports/income-statement/?${reportQuery(params)}`,
    ),
  generalLedger: (params: {
    account: string;
    from_date: string;
    to_date: string;
    branch?: string;
  }) => apiFetch<Record<string, unknown>>(`/accounting/reports/general-ledger/?${reportQuery(params)}`),
  exportCsvUrl: (type: string, params: Record<string, string | undefined>) => {
    const q = reportQuery({ type, ...params });
    const base = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1';
    return `${base}/accounting/reports/export/?${q}`;
  },
};

export async function downloadReportCsv(
  type: string,
  params: Record<string, string | undefined>,
  filename: string,
) {
  const { getDeployAccessKey } = await import('@/lib/deploy-gate');
  const base = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1';
  const sp = new URLSearchParams({ type });
  Object.entries(params).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  const headers = new Headers();
  const access = localStorage.getItem('access_token');
  const tenant = localStorage.getItem('tenant_slug') ?? 'demo';
  if (access) headers.set('Authorization', `Bearer ${access}`);
  headers.set('X-Tenant-Slug', tenant);
  const dk = getDeployAccessKey();
  if (dk) headers.set('X-Mahaly-Deploy-Key', dk);
  const res = await fetch(`${base}/accounting/reports/export/?${sp}`, { headers, credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const fixedAssetsApi = {
  list: () =>
    apiFetch<{ assets: FixedAssetDto[]; entries: unknown[] }>('/accounting/fixed-assets/'),
  create: (payload: Record<string, unknown>) =>
    apiFetch<FixedAssetDto>('/accounting/fixed-assets/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  depreciate: (id: string, period: string) =>
    apiFetch<{ asset: FixedAssetDto }>(`/accounting/fixed-assets/${id}/depreciate/`, {
      method: 'POST',
      body: JSON.stringify({ period }),
    }),
  bulkDepreciate: (period: string) =>
    apiFetch<{ asset: string; ok: boolean; amount?: string; error?: string }[]>(
      '/accounting/fixed-assets/bulk-depreciate/',
      { method: 'POST', body: JSON.stringify({ period }) },
    ),
};
