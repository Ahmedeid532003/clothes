import React, { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  bankAccountsApi,
  banksApi,
  bankingStatementsApi,
  cardAccountsApi,
  eWalletsApi,
  type BankingStatementDto,
  type BankAccountDto,
  type BankDto,
  type CardAccountDto,
  type EWalletAccountDto,
} from '@/lib/api/banking';
import { Button } from '@/components/ui/button';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';

type StmtType = 'bank' | 'bank_account' | 'card_merchant' | 'e_wallet';

export function BankingStatementsPage() {
  const { t } = useLanguage();
  const [stmtType, setStmtType] = useState<StmtType>('bank_account');
  const [entityId, setEntityId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [banks, setBanks] = useState<BankDto[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const [cardAccounts, setCardAccounts] = useState<CardAccountDto[]>([]);
  const [wallets, setWallets] = useState<EWalletAccountDto[]>([]);
  const [statement, setStatement] = useState<BankingStatementDto | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOptions = useCallback(async () => {
    const [b, ba, ca, w] = await Promise.all([
      banksApi.list(),
      bankAccountsApi.list(),
      cardAccountsApi.list(),
      eWalletsApi.list(),
    ]);
    setBanks(b);
    setBankAccounts(ba);
    setCardAccounts(ca);
    setWallets(w);
    if (!entityId) {
      if (stmtType === 'bank' && b[0]) setEntityId(b[0].id);
      if (stmtType === 'bank_account' && ba[0]) setEntityId(ba[0].id);
      if (stmtType === 'card_merchant' && ca[0]) setEntityId(ca[0].id);
      if (stmtType === 'e_wallet' && w[0]) setEntityId(w[0].id);
    }
  }, [entityId, stmtType]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const entitiesForType = () => {
    switch (stmtType) {
      case 'bank':
        return banks.map((x) => ({ id: x.id, label: x.name_ar }));
      case 'bank_account':
        return bankAccounts.map((x) => ({ id: x.id, label: `${x.name_ar} (${x.bank_name})` }));
      case 'card_merchant':
        return cardAccounts.map((x) => ({
          id: x.id,
          label: `${x.name_ar} (${x.card_network_name})`,
        }));
      case 'e_wallet':
        return wallets.map((x) => ({ id: x.id, label: `${x.name_ar} (${x.provider_name})` }));
      default:
        return [];
    }
  };

  const generate = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const data = await bankingStatementsApi.get({
        type: stmtType,
        entity_id: entityId,
        from: dateFrom || undefined,
        to: dateTo,
      });
      setStatement(data);
    } finally {
      setLoading(false);
    }
  };

  const typeLabel = (ty: StmtType) =>
    t(`bankingChannels.stmt_${ty}` as 'bankingChannels.stmt_bank');

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<FileSpreadsheet className="h-6 w-6" />}
        title={t('nav.bankingStatements')}
        description={t('bankingChannels.statementsDesc')}
        actions={
          <PageToolbar onRefresh={loadOptions}>
            <Button size="sm" onClick={generate} disabled={!entityId || loading}>
              {t('bankingChannels.generateStatement')}
            </Button>
          </PageToolbar>
        }
      />

      <div className="flex flex-wrap gap-3 items-end rounded-xl border bg-white p-4">
        <div>
          <p className="text-xs text-slate-600 mb-1">{t('bankingChannels.statementType')}</p>
          <select
            className="rounded-md border px-2 py-1.5 text-sm"
            value={stmtType}
            onChange={(e) => {
              setStmtType(e.target.value as StmtType);
              setEntityId('');
              setStatement(null);
            }}
          >
            {(['bank', 'bank_account', 'card_merchant', 'e_wallet'] as StmtType[]).map((ty) => (
              <option key={ty} value={ty}>
                {typeLabel(ty)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-slate-600 mb-1">{t('banking.account')}</p>
          <select
            className="rounded-md border px-2 py-1.5 text-sm min-w-[200px]"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          >
            {entitiesForType().map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-slate-600 mb-1">{t('purchases.date')}</p>
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="mx-1">—</span>
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {statement ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3 bg-slate-50">
              <p className="text-xs text-slate-500">{t('bankingChannels.openingBalance')}</p>
              <p className="text-lg font-bold tabular-nums">{fmtMoney(statement.opening_balance)}</p>
            </div>
            <div className="rounded-lg border p-3 bg-green-50">
              <p className="text-xs text-slate-500">{t('bankingChannels.totalIn')}</p>
              <p className="text-lg font-bold tabular-nums text-green-800">
                {fmtMoney(statement.total_in)}
              </p>
            </div>
            <div className="rounded-lg border p-3 bg-red-50">
              <p className="text-xs text-slate-500">{t('bankingChannels.totalOut')}</p>
              <p className="text-lg font-bold tabular-nums text-red-800">
                {fmtMoney(statement.total_out)}
              </p>
            </div>
            <div className="rounded-lg border p-3 bg-blue-50">
              <p className="text-xs text-slate-500">{t('bankingChannels.closingBalance')}</p>
              <p className="text-lg font-bold tabular-nums text-blue-900">
                {fmtMoney(statement.closing_balance)}
              </p>
            </div>
          </div>
          {statement.pending_balance && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {t('bankingChannels.pendingBalance')}: {fmtMoney(statement.pending_balance)}
            </p>
          )}
          <div className="rounded-xl border bg-white overflow-x-auto">
            <div className="px-4 py-2 border-b font-semibold">{statement.entity_name}</div>
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-start">{t('purchases.date')}</th>
                  <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
                  <th className="px-3 py-2 text-start">{t('accounting.notes')}</th>
                  <th className="px-3 py-2 text-end">{t('bankingChannels.colDebit')}</th>
                  <th className="px-3 py-2 text-end">{t('bankingChannels.colCredit')}</th>
                  <th className="px-3 py-2 text-end">{t('bankingChannels.colBalance')}</th>
                </tr>
              </thead>
              <tbody>
                {statement.lines.map((ln, i) => (
                  <tr key={`${ln.code}-${i}`} className="border-t">
                    <td className="px-3 py-2">{ln.date}</td>
                    <td className="px-3 py-2 font-mono text-xs">{ln.code}</td>
                    <td className="px-3 py-2">{ln.description}</td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {Number(ln.debit) > 0 ? fmtMoney(ln.debit) : '—'}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {Number(ln.credit) > 0 ? fmtMoney(ln.credit) : '—'}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums font-medium">
                      {fmtMoney(ln.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-center text-slate-500 py-12">{t('bankingChannels.noStatement')}</p>
      )}
    </div>
  );
}
