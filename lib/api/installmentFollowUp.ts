import { apiFetch } from './client';

export type SavedFollowUpList = {
  id: string;
  list_number: string;
  filter_snapshot: FollowUpFilters;
  filter_summary: string;
  customer_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export type FollowUpOptions = {
  branches: Array<{ id: string; code: string; name_ar: string }>;
  groups: Array<{ id: string; code: string; name_ar: string; region: string; display_color: string }>;
  regions: string[];
  list_numbers: string[];
  saved_lists?: SavedFollowUpList[];
};

export type FollowUpRow = {
  id: string;
  code: string;
  name_ar: string;
  phone: string;
  whatsapp: string;
  balance_due: string;
  customer_group: string;
  customer_group_name: string;
  customer_group_color?: string;
  branch_id: string;
  branch_name: string;
  region: string;
  spouse_name: string;
  kinship: string;
  late_installment_count: number;
  late_installment_value: string;
  due_installment_count: number;
  due_installment_value: string;
  first_late_due_date: string | null;
  late_months: number;
  max_days_overdue: number;
  last_payment_date: string | null;
  list_number: string;
  lawyer_name: string;
  receipt_delivery_date: string;
  case_filed_date: string;
  late_penalty_type: string;
  late_penalty_value: string;
  tier: string;
  tier_label: string;
  tier_color: string;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  notes: string;
};

export type FollowUpListResponse = {
  count: number;
  summary: { total_late_value: string; total_balance: string };
  rows: FollowUpRow[];
};

export type FollowUpFilters = {
  q?: string;
  branches?: string;
  groups?: string;
  region?: string;
  list_number?: string;
  lawyer_name?: string;
  late_count_min?: string;
  late_count_op?: string;
  late_value?: string;
  late_value_op?: string;
  balance_value?: string;
  balance_op?: string;
  late_months_min?: string;
  only_late?: string;
  case_from?: string;
  case_to?: string;
  receipt_from?: string;
  receipt_to?: string;
  payment_from?: string;
  payment_to?: string;
  period_from?: string;
  period_to?: string;
};

function qs(filters: FollowUpFilters): string {
  const sp = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const installmentFollowUpApi = {
  options: () => apiFetch<FollowUpOptions>('/inventory/installment-follow-up/options/'),
  list: (filters: FollowUpFilters = {}) =>
    apiFetch<FollowUpListResponse>(`/inventory/installment-follow-up/${qs(filters)}`),
  bulkUpdate: (customer_ids: string[], patch: Record<string, unknown>) =>
    apiFetch('/inventory/installment-follow-up/bulk-update/', {
      method: 'POST',
      body: JSON.stringify({ customer_ids, patch }),
    }),
  assignListNumber: (customer_ids: string[], list_number: string, filters?: FollowUpFilters) =>
    apiFetch<{ updated: number; saved_list?: SavedFollowUpList }>(
      '/inventory/installment-follow-up/list-number/',
      {
        method: 'POST',
        body: JSON.stringify({ customer_ids, list_number, filters }),
      },
    ),
  savedLists: () =>
    apiFetch<SavedFollowUpList[]>('/inventory/installment-follow-up/saved-lists/'),
  applyPenalties: (customer_ids: string[], penalty_type: string, penalty_value: string) =>
    apiFetch('/inventory/installment-follow-up/penalties/', {
      method: 'POST',
      body: JSON.stringify({ customer_ids, penalty_type, penalty_value }),
    }),
  sendReminders: (customer_ids: string[], channel: string, message: string) =>
    apiFetch<{ sent: Array<{ integration?: { whatsapp_url?: string } }>; sent_count: number }>(
      '/inventory/installment-follow-up/reminders/',
      {
        method: 'POST',
        body: JSON.stringify({ customer_ids, channel, message }),
      },
    ),
};
