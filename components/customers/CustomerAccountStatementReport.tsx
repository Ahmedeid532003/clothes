import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Columns3, Download, Printer, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  fetchCustomerAccountStatement,
  type CustomerAccountStatement,
  type CustomerStatementRow,
} from '@/lib/api/customers';
import { openErpDocument } from '@/lib/navigation/openDocument';
import { formatMoneyLocale } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

export type StatementViewMode = 'detailed' | 'general';
type ColDef = { key: string; header: string; group?: string; text?: boolean };

function fmtDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function fmtMoney(v: string) {
  const n = parseFloat(v);
  if (!v || Number.isNaN(n) || n === 0) return '';
  return formatMoneyLocale(v);
}

function cellMoney(v: string) {
  const n = parseFloat(v);
  if (!v || Number.isNaN(n) || n === 0) return '—';
  if (n < 0) {
    return (
      <span className="text-amber-800 font-bold tabular-nums">
        -{formatMoneyLocale(String(-n))}
      </span>
    );
  }
  return <span className="tabular-nums">{formatMoneyLocale(v)}</span>;
}

const DETAILED_COLS: ColDef[] = [
  { key: 'date_doc', header: 'dateDoc' },
  { key: 'tx_type', header: 'txType' },
  { key: 'payment_system', header: 'paymentSystem', text: true },
  { key: 'sales_amount', header: 'salesAmount', group: 'sales' },
  { key: 'sales_interest', header: 'salesInterest', group: 'sales' },
  { key: 'sales_total', header: 'salesTotal', group: 'sales' },
  { key: 'returns_amount', header: 'returnsAmount', group: 'returns' },
  { key: 'returns_interest', header: 'returnsInterest', group: 'returns' },
  { key: 'returns_total', header: 'returnsTotal', group: 'returns' },
  { key: 'payment_reservation', header: 'reservation', group: 'payments' },
  { key: 'payment_down', header: 'downPayment', group: 'payments' },
  { key: 'payment_installments', header: 'installments', group: 'payments' },
  { key: 'balance', header: 'balance' },
  { key: 'notes', header: 'notes', text: true },
];

const GENERAL_COLS: ColDef[] = [
  { key: 'date_doc', header: 'dateDoc' },
  { key: 'tx_type', header: 'txType' },
  { key: 'debit', header: 'debit' },
  { key: 'credit', header: 'credit' },
  { key: 'balance', header: 'balance' },
  { key: 'notes', header: 'notes', text: true },
];

function loadVisibleCols(view: StatementViewMode): Record<string, boolean> {
  const defs = view === 'detailed' ? DETAILED_COLS : GENERAL_COLS;
  const key = `mahaly:customerStatement:cols:${view}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...Object.fromEntries(defs.map((c) => [c.key, true])), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return Object.fromEntries(defs.map((c) => [c.key, true]));
}

function saveVisibleCols(view: StatementViewMode, cols: Record<string, boolean>) {
  localStorage.setItem(`mahaly:customerStatement:cols:${view}`, JSON.stringify(cols));
}

function rowValue(row: CustomerStatementRow, key: string): string {
  const map: Record<string, string> = {
    date_doc: row.date,
    tx_type: row.transaction_label,
    payment_system: row.payment_system,
    sales_amount: row.sales_amount,
    sales_interest: row.sales_interest,
    sales_total: row.sales_total,
    returns_amount: row.returns_amount,
    returns_interest: row.returns_interest,
    returns_total: row.returns_total,
    payment_reservation: row.payment_reservation,
    payment_down: row.payment_down,
    payment_installments: row.payment_installments,
    debit: row.debit,
    credit: row.credit,
    balance: row.balance,
    notes: row.notes,
  };
  return map[key] ?? '';
}

export function CustomerAccountStatementReport({
  customerId,
  customerName,
  embedded = false,
  autoLoad = true,
}: {
  customerId: string;
  customerName?: string;
  embedded?: boolean;
  autoLoad?: boolean;
}) {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const st = (k: string) => t(`crm.customerStatement.${k}` as never);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<StatementViewMode>('detailed');
  const [data, setData] = useState<CustomerAccountStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCols, setShowCols] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    loadVisibleCols('detailed'),
  );
  const [draftCols, setDraftCols] = useState<Record<string, boolean>>(visibleCols);

  const colDefs = viewMode === 'detailed' ? DETAILED_COLS : GENERAL_COLS;
  const activeCols = colDefs.filter((c) => visibleCols[c.key] !== false);

  useEffect(() => {
    const loaded = loadVisibleCols(viewMode);
    setVisibleCols(loaded);
    setDraftCols(loaded);
  }, [viewMode]);

  const load = useCallback(async () => {
    if (!customerId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(
        await fetchCustomerAccountStatement({
          customer: customerId,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          view: viewMode,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, dateFrom, dateTo, viewMode]);

  useEffect(() => {
    if (autoLoad && customerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on customer change only; filters use query button
  }, [autoLoad, customerId]);

  const openDoc = (row: CustomerStatementRow) => {
    if (!row.navigate_tab || !row.source_id) return;
    openErpDocument({
      tab: row.navigate_tab,
      sourceId: row.source_id,
      sourceCode: row.document_code,
    });
  };

  const exportCsv = () => {
    if (!data?.rows.length) return;
    const headers = activeCols.map((c) =>
      c.key === 'notes' ? t('inventory.notes') : st(c.header),
    );
    const lines = [headers.join(',')];
    for (const row of data.rows) {
      lines.push(
        activeCols
          .map((c) => `"${String(rowValue(row, c.key)).replace(/"/g, '""')}"`)
          .join(','),
      );
    }
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `customer-statement-${data.customer.code}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const reportTitle =
    viewMode === 'general'
      ? `${st('generalTitle')} // ${st('debit')} ${st('credit')} //`
      : `${st('title')} // ${customerName ?? data?.customer.name_ar ?? ''} //`;

  const today = new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB');

  const renderCell = (row: CustomerStatementRow, col: ColDef) => {
    if (col.key === 'date_doc') {
      return (
        <td key={col.key} className="cust-stmt-td">
          <div>{fmtDate(row.date)}</div>
          <button
            type="button"
            className="text-violet-700 font-mono text-[11px] underline hover:text-violet-900 no-print"
            title={st('openDocument')}
            onClick={() => openDoc(row)}
          >
            {row.document_code}
          </button>
          <span className="hidden print:inline font-mono text-[11px]">{row.document_code}</span>
        </td>
      );
    }
    if (col.key === 'tx_type') {
      return (
        <td key={col.key} className="cust-stmt-td font-semibold">
          {row.transaction_label}
        </td>
      );
    }
    if (col.text) {
      const val = rowValue(row, col.key);
      return (
        <td key={col.key} className="cust-stmt-td text-[11px] max-w-[160px]">
          {val || '—'}
        </td>
      );
    }
    if (col.key === 'notes') {
      return (
        <td key={col.key} className="cust-stmt-td text-start text-[11px] max-w-[200px]">
          {row.notes || '—'}
        </td>
      );
    }
    return (
      <td key={col.key} className="cust-stmt-td font-medium">
        {cellMoney(rowValue(row, col.key))}
      </td>
    );
  };

  if (!customerId) return null;

  return (
    <div className="customer-statement-report space-y-3 print:p-0" dir={isRtl ? 'rtl' : 'ltr'}>
      <style>{`
        @media print {
          .customer-statement-report .no-print { display: none !important; }
        }
        .cust-stmt-th {
          background: linear-gradient(180deg, #4c1d95 0%, #5b21b6 100%);
          color: #fff;
          font-weight: 700;
          border: 1px solid #4c1d95;
          padding: 6px 8px;
          text-align: center;
          font-size: 11px;
          white-space: nowrap;
        }
        .cust-stmt-td {
          border: 1px solid #cbd5e1;
          padding: 5px 6px;
          text-align: center;
          font-size: 11px;
          vertical-align: middle;
        }
        .cust-stmt-totals td {
          background: #ffedd5;
          font-weight: 800;
          border: 1px solid #fdba74;
        }
        .cust-stmt-highlight td {
          background: #fef9c3 !important;
        }
      `}</style>

      <div
        className={`no-print flex flex-wrap gap-2 items-end ${
          embedded ? 'rounded-lg border bg-slate-50 p-3' : ''
        }`}
      >
        <div>
          <label className="text-xs text-slate-500 block mb-0.5">{t('inventory.dateFrom')}</label>
          <Input type="date" className="h-9 w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-0.5">{t('inventory.dateTo')}</label>
          <Input type="date" className="h-9 w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="min-w-[130px]">
          <label className="text-xs text-slate-500 block mb-0.5">{st('displayType')}</label>
          <select
            className={ERP_NATIVE_SELECT}
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as StatementViewMode)}
          >
            <option value="detailed">{st('detailed')}</option>
            <option value="general">{st('general')}</option>
          </select>
        </div>
        <Button size="sm" className="bg-violet-700 hover:bg-violet-800 font-bold" onClick={load} disabled={loading}>
          {st('query')}
        </Button>
      </div>

      {error && <p className="no-print text-sm text-red-600">{error}</p>}

      {loading && !data ? (
        <p className="text-sm p-2">{t('inventory.loading')}</p>
      ) : data ? (
        <div className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden print:border-0 print:shadow-none">
          <div className="border-b border-slate-200 px-4 py-3 flex flex-wrap justify-between gap-2 text-sm">
            <div className="text-slate-600 font-semibold">{user?.full_name || user?.username}</div>
            <div className="text-center flex-1 min-w-[220px]">
              <p className="font-black text-slate-900 text-base">{reportTitle}</p>
              <p className="text-xs text-slate-500 font-mono">{data.customer.code}</p>
            </div>
            <div className="text-slate-600 text-end text-xs">{today}</div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-slate-50">
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => { setDraftCols(visibleCols); setShowCols((v) => !v); }}>
                <Columns3 className="h-4 w-4 me-1" />
                {st('columns')}
              </Button>
              {showCols && (
                <div className="absolute z-20 top-full mt-1 min-w-[220px] rounded-lg border bg-white shadow-lg p-3 space-y-2 max-h-72 overflow-y-auto">
                  {colDefs.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draftCols[c.key] !== false}
                        onChange={(e) => setDraftCols((v) => ({ ...v, [c.key]: e.target.checked }))}
                      />
                      <span>{c.key === 'notes' ? t('inventory.notes') : st(c.header)}</span>
                    </label>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setShowCols(false)}>{t('inventory.cancel')}</Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setVisibleCols(draftCols);
                        saveVisibleCols(viewMode, draftCols);
                        setShowCols(false);
                      }}
                    >
                      {t('inventory.save')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!data.rows.length}>
              <Download className="h-4 w-4 me-1" />
              {st('exportExcel')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!data.rows.length}>
              <Printer className="h-4 w-4 me-1" />
              {st('printPdf')}
            </Button>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="overflow-x-auto">
            {data.rows.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">{st('noData')}</p>
            ) : (
              <table
                className="w-full border-collapse min-w-[1100px]"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                <thead>
                  {viewMode === 'detailed' ? (
                    <>
                      <tr>
                        {activeCols.some((c) => c.key === 'date_doc') && (
                          <th className="cust-stmt-th" rowSpan={2}>{st('dateDoc')}</th>
                        )}
                        {activeCols.some((c) => c.key === 'tx_type') && (
                          <th className="cust-stmt-th" rowSpan={2}>{st('txType')}</th>
                        )}
                        {activeCols.some((c) => c.key === 'payment_system') && (
                          <th className="cust-stmt-th" rowSpan={2}>{st('paymentSystem')}</th>
                        )}
                        {activeCols.some((c) => c.group === 'sales') && (
                          <th className="cust-stmt-th" colSpan={activeCols.filter((c) => c.group === 'sales').length}>
                            {st('sales')}
                          </th>
                        )}
                        {activeCols.some((c) => c.group === 'returns') && (
                          <th className="cust-stmt-th" colSpan={activeCols.filter((c) => c.group === 'returns').length}>
                            {st('returns')}
                          </th>
                        )}
                        {activeCols.some((c) => c.group === 'payments') && (
                          <th className="cust-stmt-th" colSpan={activeCols.filter((c) => c.group === 'payments').length}>
                            {st('payments')}
                          </th>
                        )}
                        {activeCols.some((c) => c.key === 'balance') && (
                          <th className="cust-stmt-th" rowSpan={2}>{st('balance')}</th>
                        )}
                        {activeCols.some((c) => c.key === 'notes') && (
                          <th className="cust-stmt-th" rowSpan={2}>{t('inventory.notes')}</th>
                        )}
                      </tr>
                      <tr>
                        {activeCols.filter((c) => c.group === 'sales').map((c) => (
                          <th key={c.key} className="cust-stmt-th">{st(c.header)}</th>
                        ))}
                        {activeCols.filter((c) => c.group === 'returns').map((c) => (
                          <th key={c.key} className="cust-stmt-th">{st(c.header)}</th>
                        ))}
                        {activeCols.filter((c) => c.group === 'payments').map((c) => (
                          <th key={c.key} className="cust-stmt-th">{st(c.header)}</th>
                        ))}
                      </tr>
                    </>
                  ) : (
                    <tr>
                      {activeCols.map((c) => (
                        <th key={c.key} className="cust-stmt-th">
                          {c.key === 'notes' ? t('inventory.notes') : st(c.header)}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/80 ${row.highlight ? 'cust-stmt-highlight' : ''}`}
                    >
                      {activeCols.map((c) => renderCell(row, c))}
                    </tr>
                  ))}
                  <tr className="cust-stmt-totals">
                    {(() => {
                      const leading = activeCols.filter((c) =>
                        ['date_doc', 'tx_type', 'payment_system'].includes(c.key),
                      ).length;
                      const trailing = activeCols.filter(
                        (c) => !['date_doc', 'tx_type', 'payment_system'].includes(c.key),
                      );
                      return (
                        <>
                          <td className="cust-stmt-td text-start font-black" colSpan={Math.max(1, leading)}>
                            {st('totalsRow')}
                          </td>
                          {trailing.map((c) => {
                            if (c.text || c.key === 'notes') {
                              return <td key={c.key} className="cust-stmt-td" />;
                            }
                            if (c.key === 'balance') {
                              return (
                                <td key={c.key} className="cust-stmt-td">
                                  {cellMoney(data.summary.closing_balance)}
                                </td>
                              );
                            }
                            const colVal = data.summary.columns[c.key];
                            return (
                              <td key={c.key} className="cust-stmt-td">
                                {cellMoney(colVal ?? '0')}
                              </td>
                            );
                          })}
                        </>
                      );
                    })()}
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {data.rows.length > 0 && (
            <div className="grid gap-3 p-4 md:grid-cols-3 border-t border-slate-200 text-sm">
              <div className="rounded-lg border border-violet-200 overflow-hidden md:col-span-1">
                <div className="bg-violet-800 text-white px-3 py-1.5 font-bold text-center text-xs">
                  {st('sales')}
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('totalSales')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums">{fmtMoney(data.summary.total_sales)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('totalReturns')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums">{fmtMoney(data.summary.total_returns)}</td>
                    </tr>
                    <tr className="bg-violet-50">
                      <td className="px-2 py-1.5 font-bold">{st('netSold')}</td>
                      <td className="px-2 py-1.5 text-end font-black tabular-nums">{fmtMoney(data.summary.net_sold)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-violet-200 overflow-hidden md:col-span-1">
                <div className="bg-violet-800 text-white px-3 py-1.5 font-bold text-center text-xs">
                  {st('payments')}
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('totalPayments')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums">{fmtMoney(data.summary.total_payments)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('cashRefunds')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums text-amber-800">
                        {fmtMoney(data.summary.cash_refunds)}
                      </td>
                    </tr>
                    <tr className="bg-violet-50">
                      <td className="px-2 py-1.5 font-bold">{st('netPayments')}</td>
                      <td className="px-2 py-1.5 text-end font-black tabular-nums">{fmtMoney(data.summary.net_payments)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-violet-200 overflow-hidden md:col-span-1">
                <div className="bg-violet-800 text-white px-3 py-1.5 font-bold text-center text-xs">
                  {st('finalBalance')}
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('debit')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums text-red-700">
                        {fmtMoney(data.summary.closing_debit)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('credit')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums text-emerald-700">
                        {fmtMoney(data.summary.closing_credit)}
                      </td>
                    </tr>
                    <tr className="bg-violet-50">
                      <td className="px-2 py-1.5 font-black">{data.summary.balance_label}</td>
                      <td className="px-2 py-1.5 text-end font-black tabular-nums text-lg">
                        {fmtMoney(
                          parseFloat(data.summary.closing_debit) > 0
                            ? data.summary.closing_debit
                            : data.summary.closing_credit,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
