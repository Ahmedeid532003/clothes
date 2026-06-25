import { apiFetch } from './client';

export type BankDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  created_at?: string;
};

export type BankAccountDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  bank: string;
  bank_name: string;
  account_number: string;
  opening_balance: string;
  current_balance: string;
  gl_account: string | null;
  notes: string;
  is_active: boolean;
  created_at?: string;
};

export type BankMovementDto = {
  id: string;
  code: string;
  bank_account: string;
  bank_account_name: string;
  counter_account: string | null;
  counter_account_name: string | null;
  movement_type: string;
  movement_date: string;
  amount: string;
  status: string;
  notes: string;
  cheque: string | null;
  created_by_name: string | null;
  posted_at: string | null;
  created_at?: string;
};

export type ChequePaperType = 'cheque' | 'promissory_note' | 'bill_of_exchange' | 'other_paper';
export type ChequeStatus =
  | 'pending'
  | 'delivered'
  | 'paid'
  | 'cancelled'
  | 'returned'
  | 'rejected';

export type ChequeDto = {
  id: string;
  code: string;
  paper_type: ChequePaperType;
  direction: 'payable' | 'receivable';
  cheque_number: string;
  bank_account: string;
  bank_account_name: string;
  bank_name: string;
  amount: string;
  due_date: string;
  delivery_date: string | null;
  status: ChequeStatus;
  party_name: string;
  notes: string;
  alert_sent: boolean;
  pay_source?: 'cash' | 'bank' | null;
  pay_bank_account?: string | null;
  pay_bank_account_name?: string;
  pay_amount?: string | null;
  pay_date?: string | null;
  pay_notes?: string;
  paid_at: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_at?: string;
  days_until_due?: number;
};

export type ChequePayPayload = {
  pay_source: 'cash' | 'bank';
  amount: string;
  pay_date: string;
  pay_bank_account?: string;
  pay_notes?: string;
};

export const banksApi = {
  list: () => apiFetch<BankDto[]>('/banking/banks/'),
  create: (payload: Record<string, unknown>) =>
    apiFetch<BankDto>('/banking/banks/', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<BankDto>(`/banking/banks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/banking/banks/${id}/`, { method: 'DELETE' }),
};

export const bankAccountsApi = {
  list: (bankId?: string) => {
    const q = bankId ? `?bank=${bankId}` : '';
    return apiFetch<BankAccountDto[]>(`/banking/accounts/${q}`);
  },
  create: (payload: Record<string, unknown>) =>
    apiFetch<BankAccountDto>('/banking/accounts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<BankAccountDto>(`/banking/accounts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/banking/accounts/${id}/`, { method: 'DELETE' }),
};

export const bankMovementsApi = {
  list: (accountId?: string) => {
    const q = accountId ? `?bank_account=${accountId}` : '';
    return apiFetch<BankMovementDto[]>(`/banking/movements/${q}`);
  },
  create: (payload: Record<string, unknown>) =>
    apiFetch<BankMovementDto>('/banking/movements/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  post: (id: string) =>
    apiFetch<BankMovementDto>(`/banking/movements/${id}/post/`, { method: 'POST' }),
};

export const chequesApi = {
  list: (params?: { status?: string; direction?: string; paper_type?: string; source?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.direction) sp.set('direction', params.direction);
    if (params?.paper_type) sp.set('paper_type', params.paper_type);
    if (params?.source) sp.set('source', params.source);
    const q = sp.toString() ? `?${sp}` : '';
    return apiFetch<ChequeDto[]>(`/banking/cheques/${q}`);
  },
  alerts: (days = 2) => apiFetch<ChequeDto[]>(`/banking/cheques/alerts/?days=${days}`),
  create: (payload: Record<string, unknown>) =>
    apiFetch<ChequeDto>('/banking/cheques/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<ChequeDto>(`/banking/cheques/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/banking/cheques/${id}/`, { method: 'DELETE' }),
  pay: (id: string, payload?: ChequePayPayload) =>
    apiFetch<ChequeDto>(`/banking/cheques/${id}/pay/`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),
  deliver: (id: string, delivery_date?: string) =>
    apiFetch<ChequeDto>(`/banking/cheques/${id}/deliver/`, {
      method: 'POST',
      body: JSON.stringify(delivery_date ? { delivery_date } : {}),
    }),
  cancel: (id: string) =>
    apiFetch<ChequeDto>(`/banking/cheques/${id}/cancel/`, { method: 'POST' }),
  return: (id: string) =>
    apiFetch<ChequeDto>(`/banking/cheques/${id}/return/`, { method: 'POST' }),
  reject: (id: string) =>
    apiFetch<ChequeDto>(`/banking/cheques/${id}/reject/`, { method: 'POST' }),
};

export type CardNetworkDto = BankDto;
export type CardAccountDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  card_network: string;
  card_network_name: string;
  bank_account: string;
  bank_account_name: string;
  bank_name: string;
  opening_balance: string;
  pending_balance: string;
  settled_balance: string;
  current_balance: string;
  notes: string;
  is_active: boolean;
};

export type CardTransactionDto = {
  id: string;
  code: string;
  transaction_number: string;
  card_merchant_account: string;
  card_merchant_account_name: string;
  card_network_name: string;
  bank_account: string;
  bank_account_name: string;
  bank_name: string;
  amount: string;
  transaction_date: string;
  party_type: string;
  customer: string | null;
  customer_name: string | null;
  supplier: string | null;
  supplier_name: string | null;
  party_name: string;
  sale: string | null;
  sale_code: string | null;
  status: 'pending' | 'settled' | 'rejected';
  settled_at: string | null;
  notes: string;
};

export type EWalletProviderDto = BankDto;
export type EWalletAccountDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  provider: string;
  provider_name: string;
  wallet_number: string;
  bank_account: string | null;
  bank_account_name: string | null;
  opening_balance: string;
  current_balance: string;
  notes: string;
  is_active: boolean;
};

export type EWalletMovementDto = {
  id: string;
  code: string;
  e_wallet_account: string;
  e_wallet_account_name: string;
  counter_wallet: string | null;
  counter_wallet_name: string | null;
  movement_type: string;
  movement_date: string;
  amount: string;
  status: string;
  sale: string | null;
  sale_code: string | null;
  notes: string;
  posted_at: string | null;
};

export type ChannelTransferDto = {
  id: string;
  code: string;
  from_bank_account: string | null;
  from_bank_account_name: string | null;
  from_wallet: string | null;
  from_wallet_name: string | null;
  to_bank_account: string | null;
  to_bank_account_name: string | null;
  to_wallet: string | null;
  to_wallet_name: string | null;
  amount: string;
  transfer_date: string;
  status: string;
  notes: string;
};

export type StatementLineDto = {
  date: string;
  code: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  status: string;
};

export type BankingStatementDto = {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  date_from: string | null;
  date_to: string;
  opening_balance: string;
  total_in: string;
  total_out: string;
  closing_balance: string;
  pending_balance?: string;
  lines: StatementLineDto[];
};

export type PaymentMethodsDashboardDto = {
  date_from: string | null;
  date_to: string;
  cards: { pending: string; settled: string };
  totals: Record<'cash' | 'card' | 'wallet' | 'instapay' | 'credit' | 'installment' | 'reserved', string>;
  cash_flow: Array<{
    date: string;
    cash: string;
    card: string;
    wallet: string;
    instapay: string;
    credit: string;
    installment: string;
    reserved: string;
    total: string;
  }>;
};

export const cardNetworksApi = {
  list: () => apiFetch<CardNetworkDto[]>('/banking/card-networks/'),
  create: (payload: Record<string, unknown>) =>
    apiFetch<CardNetworkDto>('/banking/card-networks/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<CardNetworkDto>(`/banking/card-networks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/banking/card-networks/${id}/`, { method: 'DELETE' }),
};

export const cardAccountsApi = {
  list: (networkId?: string) => {
    const q = networkId ? `?network=${networkId}` : '';
    return apiFetch<CardAccountDto[]>(`/banking/card-accounts/${q}`);
  },
  create: (payload: Record<string, unknown>) =>
    apiFetch<CardAccountDto>('/banking/card-accounts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<CardAccountDto>(`/banking/card-accounts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/banking/card-accounts/${id}/`, { method: 'DELETE' }),
};

export const cardTransactionsApi = {
  list: (params?: { status?: string; card_account?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.card_account) sp.set('card_account', params.card_account);
    const q = sp.toString() ? `?${sp}` : '';
    return apiFetch<CardTransactionDto[]>(`/banking/card-transactions/${q}`);
  },
  create: (payload: Record<string, unknown>) =>
    apiFetch<CardTransactionDto>('/banking/card-transactions/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  settle: (id: string) =>
    apiFetch<CardTransactionDto>(`/banking/card-transactions/${id}/settle/`, {
      method: 'POST',
    }),
  reject: (id: string) =>
    apiFetch<CardTransactionDto>(`/banking/card-transactions/${id}/reject/`, {
      method: 'POST',
    }),
};

export const walletProvidersApi = {
  list: () => apiFetch<EWalletProviderDto[]>('/banking/wallet-providers/'),
  create: (payload: Record<string, unknown>) =>
    apiFetch<EWalletProviderDto>('/banking/wallet-providers/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<EWalletProviderDto>(`/banking/wallet-providers/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/banking/wallet-providers/${id}/`, { method: 'DELETE' }),
};

export const eWalletsApi = {
  list: (providerId?: string) => {
    const q = providerId ? `?provider=${providerId}` : '';
    return apiFetch<EWalletAccountDto[]>(`/banking/wallets/${q}`);
  },
  create: (payload: Record<string, unknown>) =>
    apiFetch<EWalletAccountDto>('/banking/wallets/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    apiFetch<EWalletAccountDto>(`/banking/wallets/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/banking/wallets/${id}/`, { method: 'DELETE' }),
};

export const walletMovementsApi = {
  list: (accountId?: string) => {
    const q = accountId ? `?e_wallet_account=${accountId}` : '';
    return apiFetch<EWalletMovementDto[]>(`/banking/wallet-movements/${q}`);
  },
  create: (payload: Record<string, unknown>) =>
    apiFetch<EWalletMovementDto>('/banking/wallet-movements/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  post: (id: string) =>
    apiFetch<EWalletMovementDto>(`/banking/wallet-movements/${id}/post/`, {
      method: 'POST',
    }),
};

export const channelTransfersApi = {
  list: () => apiFetch<ChannelTransferDto[]>('/banking/channel-transfers/'),
  create: (payload: Record<string, unknown>) =>
    apiFetch<ChannelTransferDto>('/banking/channel-transfers/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const bankingStatementsApi = {
  get: (params: {
    type: string;
    entity_id: string;
    from?: string;
    to?: string;
  }) => {
    const sp = new URLSearchParams({
      type: params.type,
      entity_id: params.entity_id,
    });
    if (params.from) sp.set('from', params.from);
    if (params.to) sp.set('to', params.to);
    return apiFetch<BankingStatementDto>(`/banking/statements/?${sp}`);
  },
};

export const paymentMethodsDashboardApi = {
  get: (params?: { from?: string; to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    const q = sp.toString();
    return apiFetch<PaymentMethodsDashboardDto>(`/banking/payment-methods/dashboard/${q ? `?${q}` : ''}`);
  },
};
