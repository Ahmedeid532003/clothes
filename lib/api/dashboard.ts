import { apiFetch } from './client';
import { cacheKey, cachedGet } from './request-cache';

export type ControlPanelKpiBlock = {
  net: string;
  sales: string;
  returns: string;
};

export type ControlPanelDashboardDto = {
  period: {
    key: string;
    date_from: string;
    date_to: string;
  };
  kpis: {
    cash_sales: ControlPanelKpiBlock;
    credit_advances: ControlPanelKpiBlock;
    net_credit_sales: ControlPanelKpiBlock;
    net_reservations: ControlPanelKpiBlock;
    installment_collections: ControlPanelKpiBlock;
    grand_net: string;
  };
  revenue: {
    total: string;
    actual_cash: string;
    visa_wallets: string;
  };
  expenses: {
    supplier_payments_cash: string;
    salaries_advances: string;
    general_expenses: string;
    supplier_payments_chq: string;
    bank_deposit: string;
    owner_withdrawals: string;
    owner_deposit_treasury: string;
    paid_checks: string;
  };
  total_expenses: string;
  treasury: {
    net_total: string;
    cash_hand: string;
    visa_wallets: string;
  };
  branch_sales: Array<{
    branch_id: string;
    name: string;
    value: string;
    pct: number;
  }>;
  pending_shifts: Array<{
    cashier: string;
    close_label: string;
    amount: string;
    tag: string;
    live: boolean;
  }>;
  pending_shifts_count: number;
  banks: Array<{ name: string; balance: string }>;
  bank_total: string;
  checks_due_month: string;
  attendance: Array<{
    name: string;
    sub: string;
    time: string;
    delay: string;
    status: 'ok' | 'late' | 'absent';
  }>;
};

export type ControlPanelQuery = {
  period?: 'today' | 'yesterday' | 'week';
  date_from?: string;
  date_to?: string;
  branch?: string;
};

function buildQuery(params?: ControlPanelQuery) {
  const sp = new URLSearchParams();
  if (params?.period) sp.set('period', params.period);
  if (params?.date_from) sp.set('date_from', params.date_from);
  if (params?.date_to) sp.set('date_to', params.date_to);
  if (params?.branch) sp.set('branch', params.branch);
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export async function fetchControlPanelDashboard(
  params?: ControlPanelQuery,
): Promise<ControlPanelDashboardDto> {
  const path = `/dashboard/control-panel/${buildQuery(params)}`;
  return cachedGet(cacheKey(path), () => apiFetch<ControlPanelDashboardDto>(path), 90_000);
}
