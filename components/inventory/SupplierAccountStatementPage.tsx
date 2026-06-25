import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Columns3,
  Download,
  FileText,
  Landmark,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  fetchSeasons,
  fetchSupplierAccountStatement,
  fetchSuppliers,
  type SeasonDto,
  type SupplierAccountStatement,
  type SupplierDto,
  type SupplierStatementRow,
} from '@/lib/api/inventory';
import { openErpDocument } from '@/lib/navigation/openDocument';
import { formatMoneyLocale } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

type ViewMode = 'detailed' | 'general';

type ColDef = { key: string; header: string; group?: string };

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
  const s = fmtMoney(v);
  return s || '—';
}

const DETAILED_COLS: ColDef[] = [
  { key: 'date_doc', header: 'dateDoc' },
  { key: 'season', header: 'season' },
  { key: 'tx_type', header: 'txType' },
  { key: 'purchases_total', header: 'total', group: 'purchases' },
  { key: 'purchases_discount', header: 'discount', group: 'purchases' },
  { key: 'purchases_net', header: 'net', group: 'purchases' },
  { key: 'returns_total', header: 'total', group: 'returns' },
  { key: 'returns_discount', header: 'discount', group: 'returns' },
  { key: 'returns_net', header: 'net', group: 'returns' },
  { key: 'okazion_discount', header: 'okazionDiscount' },
  { key: 'payment_cash', header: 'cash', group: 'payments' },
  { key: 'payment_papers', header: 'papers', group: 'payments' },
  { key: 'balance', header: 'balance' },
  { key: 'notes', header: 'notes' },
];

const GENERAL_COLS: ColDef[] = [
  { key: 'date_doc', header: 'dateDoc' },
  { key: 'season', header: 'season' },
  { key: 'tx_type', header: 'txType' },
  { key: 'debit', header: 'debit' },
  { key: 'credit', header: 'credit' },
  { key: 'balance', header: 'balance' },
  { key: 'notes', header: 'notes' },
];

function loadVisibleCols(view: ViewMode): Record<string, boolean> {
  const defs = view === 'detailed' ? DETAILED_COLS : GENERAL_COLS;
  const key = `mahaly:supplierStatement:cols:${view}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...Object.fromEntries(defs.map((c) => [c.key, true])), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return Object.fromEntries(defs.map((c) => [c.key, true]));
}

function saveVisibleCols(view: ViewMode, cols: Record<string, boolean>) {
  localStorage.setItem(`mahaly:supplierStatement:cols:${view}`, JSON.stringify(cols));
}

function rowValue(row: SupplierStatementRow, key: string): string {
  const map: Record<string, string> = {
    date_doc: row.date,
    season: row.season_name,
    tx_type: row.transaction_label,
    purchases_total: row.purchases_total,
    purchases_discount: row.purchases_discount,
    purchases_net: row.purchases_net,
    returns_total: row.returns_total,
    returns_discount: row.returns_discount,
    returns_net: row.returns_net,
    okazion_discount: row.okazion_discount,
    payment_cash: row.payment_cash,
    payment_papers: row.payment_papers,
    debit: row.debit,
    credit: row.credit,
    balance: row.balance,
    notes: row.notes,
  };
  return map[key] ?? '';
}

export function SupplierAccountStatementPage() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const st = (k: string) => t(`inventory.supplierStatement.${k}` as never);

  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [data, setData] = useState<SupplierAccountStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCols, setShowCols] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    loadVisibleCols('detailed'),
  );
  const [draftCols, setDraftCols] = useState<Record<string, boolean>>(visibleCols);

  const colDefs = viewMode === 'detailed' ? DETAILED_COLS : GENERAL_COLS;
  const activeCols = colDefs.filter((c) => visibleCols[c.key] !== false);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId),
    [suppliers, supplierId],
  );

  useEffect(() => {
    fetchSuppliers().then((rows) => setSuppliers(rows as SupplierDto[]));
    fetchSeasons().then(setSeasons).catch(() => setSeasons([]));
  }, []);

  useEffect(() => {
    const loaded = loadVisibleCols(viewMode);
    setVisibleCols(loaded);
    setDraftCols(loaded);
  }, [viewMode]);

  const load = useCallback(async () => {
    if (!supplierId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(
        await fetchSupplierAccountStatement({
          supplier: supplierId,
          season: seasonId || undefined,
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
  }, [supplierId, seasonId, dateFrom, dateTo, viewMode]);

  const openDoc = (row: SupplierStatementRow) => {
    if (!row.navigate_tab || !row.source_id) return;
    openErpDocument({
      tab: row.navigate_tab,
      sourceId: row.source_id,
      sourceCode: row.document_code,
    });
  };

  const exportCsv = () => {
    if (!data?.rows.length) return;
    const headers = activeCols.map((c) => st(c.header));
    const lines = [headers.join(',')];
    for (const row of data.rows) {
      lines.push(
        activeCols
          .map((c) => {
            const v = rowValue(row, c.key);
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(','),
      );
    }
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `supplier-statement-${data.supplier.code}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printReport = () => window.print();

  const reportTitle =
    viewMode === 'general'
      ? `${st('generalTitle')} // ${st('debit')} ${st('credit')} //`
      : `${st('title')} // ${selectedSupplier?.name_ar ?? ''} //`;

  const today = new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB');

  return (
    <div className="supplier-statement-page space-y-3 p-1 print:p-0" dir={isRtl ? 'rtl' : 'ltr'}>
      <style>{`
        @media print {
          .supplier-statement-page .no-print { display: none !important; }
          .supplier-statement-page .screen-only { display: none !important; }
          .supplier-statement-page { padding: 0; }
        }
        .supplier-stmt-th {
          background: linear-gradient(180deg, #1e40af 0%, #1d4ed8 100%);
          color: #fff;
          font-weight: 700;
          border: 1px solid #1e3a8a;
          padding: 6px 8px;
          text-align: center;
          font-size: 12px;
        }
        .supplier-stmt-td {
          border: 1px solid #cbd5e1;
          padding: 5px 8px;
          text-align: center;
          font-size: 12px;
          vertical-align: middle;
        }
        .supplier-stmt-totals td {
          background: #dbeafe;
          font-weight: 800;
          border: 1px solid #93c5fd;
        }
      `}</style>

      {/* Filters */}
      <div className="no-print rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Landmark className="h-6 w-6 text-blue-700" />
              {st('title')}
            </h1>
            <p className="text-xs text-slate-500 mt-1">{st('periodFilterHint')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <div className="min-w-[200px]">
            <label className="text-xs text-slate-500 block mb-0.5">{t('inventory.selectSupplier')}</label>
            <select
              className={ERP_NATIVE_SELECT}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">{t('inventory.selectSupplier')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-slate-500 block mb-0.5">{st('season')}</label>
            <select
              className={ERP_NATIVE_SELECT}
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
            >
              <option value="">{st('allSeasons')}</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-0.5">{t('inventory.dateFrom')}</label>
            <Input type="date" className="h-9 w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-0.5">{t('inventory.dateTo')}</label>
            <Input type="date" className="h-9 w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs text-slate-500 block mb-0.5">{st('displayType')}</label>
            <select
              className={ERP_NATIVE_SELECT}
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
            >
              <option value="detailed">{st('detailed')}</option>
              <option value="general">{st('general')}</option>
            </select>
          </div>
          <Button size="sm" className="bg-blue-700 hover:bg-blue-800 font-bold" onClick={load} disabled={loading || !supplierId}>
            <Search className="h-4 w-4 me-1" />
            {st('query')}
          </Button>
        </div>
      </div>

      {error && <p className="no-print text-sm text-red-600">{error}</p>}

      {!supplierId && !loading && (
        <p className="text-sm text-slate-500">{st('selectSupplierFirst')}</p>
      )}

      {data && (
        <div className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden print:border-0 print:shadow-none">
          {/* Report header */}
          <div className="border-b border-slate-200 px-4 py-3 flex flex-wrap justify-between gap-2 text-sm">
            <div className="text-slate-600">
              <span className="font-semibold">{user?.full_name || user?.username || '—'}</span>
            </div>
            <div className="text-center flex-1 min-w-[200px]">
              <p className="font-black text-slate-900 text-base">{reportTitle}</p>
              {data.season_name ? (
                <p className="text-xs text-slate-500 mt-0.5">
                  {st('season')}: {data.season_name}
                </p>
              ) : null}
            </div>
            <div className="text-slate-600 text-end text-xs">
              <p>{user?.full_name || user?.username}</p>
              <p>{today}</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="no-print flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-slate-50">
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => { setDraftCols(visibleCols); setShowCols((v) => !v); }}>
                <Columns3 className="h-4 w-4 me-1" />
                {st('columns')}
              </Button>
              {showCols && (
                <div className="absolute z-20 top-full mt-1 min-w-[200px] rounded-lg border bg-white shadow-lg p-3 space-y-2">
                  <p className="text-xs font-bold text-slate-700">{st('columns')}</p>
                  {colDefs.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draftCols[c.key] !== false}
                        onChange={(e) => setDraftCols((v) => ({ ...v, [c.key]: e.target.checked }))}
                      />
                      <span>{st(c.header)}</span>
                    </label>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const all = Object.fromEntries(colDefs.map((c) => [c.key, true]));
                        setDraftCols(all);
                        setVisibleCols(all);
                        saveVisibleCols(viewMode, all);
                        setShowCols(false);
                      }}
                    >
                      {t('inventory.cancel')}
                    </Button>
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
            <Button size="sm" variant="outline" onClick={printReport} disabled={!data.rows.length}>
              <Printer className="h-4 w-4 me-1" />
              {st('printPdf')}
            </Button>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <p className="p-4 text-sm">{t('inventory.loading')}</p>
            ) : data.rows.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">{st('noData')}</p>
            ) : (
              <table className="w-full border-collapse min-w-[900px]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                <thead>
                  {viewMode === 'detailed' ? (
                    <>
                      <tr>
                        {activeCols.some((c) => c.key === 'date_doc') && (
                          <th className="supplier-stmt-th" rowSpan={2}>{st('dateDoc')}</th>
                        )}
                        {activeCols.some((c) => c.key === 'season') && (
                          <th className="supplier-stmt-th" rowSpan={2}>{st('season')}</th>
                        )}
                        {activeCols.some((c) => c.key === 'tx_type') && (
                          <th className="supplier-stmt-th" rowSpan={2}>{st('txType')}</th>
                        )}
                        {activeCols.some((c) => c.group === 'purchases') && (
                          <th className="supplier-stmt-th" colSpan={activeCols.filter((c) => c.group === 'purchases').length}>
                            {st('purchases')}
                          </th>
                        )}
                        {activeCols.some((c) => c.group === 'returns') && (
                          <th className="supplier-stmt-th" colSpan={activeCols.filter((c) => c.group === 'returns').length}>
                            {st('returns')}
                          </th>
                        )}
                        {activeCols.some((c) => c.key === 'okazion_discount') && (
                          <th className="supplier-stmt-th" rowSpan={2}>{st('okazionDiscount')}</th>
                        )}
                        {activeCols.some((c) => c.group === 'payments') && (
                          <th className="supplier-stmt-th" colSpan={activeCols.filter((c) => c.group === 'payments').length}>
                            {st('payments')}
                          </th>
                        )}
                        {activeCols.some((c) => c.key === 'balance') && (
                          <th className="supplier-stmt-th" rowSpan={2}>{st('balance')}</th>
                        )}
                        {activeCols.some((c) => c.key === 'notes') && (
                          <th className="supplier-stmt-th" rowSpan={2}>{t('inventory.notes')}</th>
                        )}
                      </tr>
                      <tr>
                        {activeCols.filter((c) => c.group === 'purchases').map((c) => (
                          <th key={c.key} className="supplier-stmt-th">{st(c.header)}</th>
                        ))}
                        {activeCols.filter((c) => c.group === 'returns').map((c) => (
                          <th key={c.key} className="supplier-stmt-th">{st(c.header)}</th>
                        ))}
                        {activeCols.filter((c) => c.group === 'payments').map((c) => (
                          <th key={c.key} className="supplier-stmt-th">{st(c.header)}</th>
                        ))}
                      </tr>
                    </>
                  ) : (
                    <tr>
                      {activeCols.map((c) => (
                        <th key={c.key} className="supplier-stmt-th">
                          {c.key === 'notes' ? t('inventory.notes') : st(c.header)}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      {activeCols.map((c) => {
                        if (c.key === 'date_doc') {
                          return (
                            <td key={c.key} className="supplier-stmt-td">
                              <div>{fmtDate(row.date)}</div>
                              <button
                                type="button"
                                className="text-blue-700 font-mono text-[11px] underline hover:text-blue-900 no-print"
                                title={st('openDocument')}
                                onClick={() => openDoc(row)}
                              >
                                {row.document_code}
                              </button>
                              <span className="hidden print:inline font-mono text-[11px]">{row.document_code}</span>
                            </td>
                          );
                        }
                        if (c.key === 'season') {
                          return (
                            <td key={c.key} className="supplier-stmt-td">{row.season_name || '—'}</td>
                          );
                        }
                        if (c.key === 'tx_type') {
                          return (
                            <td key={c.key} className="supplier-stmt-td font-semibold">{row.transaction_label}</td>
                          );
                        }
                        if (c.key === 'notes') {
                          return (
                            <td key={c.key} className="supplier-stmt-td text-start max-w-[180px] text-[11px]">
                              {row.notes || '—'}
                            </td>
                          );
                        }
                        const val = rowValue(row, c.key);
                        return (
                          <td key={c.key} className="supplier-stmt-td tabular-nums font-medium">
                            {cellMoney(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="supplier-stmt-totals">
                    {(() => {
                      const leading = activeCols.filter((c) =>
                        ['date_doc', 'season', 'tx_type'].includes(c.key),
                      ).length;
                      const trailing = activeCols.filter(
                        (c) => !['date_doc', 'season', 'tx_type'].includes(c.key),
                      );
                      return (
                        <>
                          <td
                            className="supplier-stmt-td text-start font-black"
                            colSpan={Math.max(1, leading)}
                          >
                            {st('totalsRow')}
                          </td>
                          {trailing.map((c) => {
                            if (c.key === 'notes') {
                              return <td key={c.key} className="supplier-stmt-td" />;
                            }
                            if (c.key === 'balance') {
                              return (
                                <td key={c.key} className="supplier-stmt-td tabular-nums">
                                  {cellMoney(data.summary.closing_balance)}
                                </td>
                              );
                            }
                            return (
                              <td key={c.key} className="supplier-stmt-td tabular-nums">
                                {cellMoney(data.summary.columns[c.key] ?? '0')}
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

          {/* Footer summaries */}
          {data.rows.length > 0 && (
            <div className="grid gap-3 p-4 md:grid-cols-3 border-t border-slate-200 text-sm">
              <div className="rounded-lg border border-blue-200 overflow-hidden">
                <div className="bg-blue-800 text-white px-3 py-1.5 font-bold text-center text-xs">
                  {st('purchases')}
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('netPurchases')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums">{fmtMoney(data.summary.net_purchases)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('netReturns')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums">{fmtMoney(data.summary.columns.returns_net)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('saleDiscount')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums">{fmtMoney(data.summary.columns.okazion_discount)}</td>
                    </tr>
                    <tr className="border-b bg-blue-50">
                      <td className="px-2 py-1.5 font-bold">{st('netAfterDiscount')}</td>
                      <td className="px-2 py-1.5 text-end font-black tabular-nums">{fmtMoney(data.summary.net_after_returns_discount)}</td>
                    </tr>
                    <tr className="screen-only bg-amber-50">
                      <td className="px-2 py-1.5">
                        <span className="font-semibold">{st('actualSupplierSales')}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{st('actualSupplierSalesHint')}</p>
                      </td>
                      <td className="px-2 py-1.5 text-end font-black tabular-nums text-amber-900">
                        {fmtMoney(data.summary.actual_supplier_sales)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-blue-200 overflow-hidden">
                <div className="bg-blue-800 text-white px-3 py-1.5 font-bold text-center text-xs">
                  {st('payments')}
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('cashPayments')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums">{fmtMoney(data.summary.columns.payment_cash)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('paperPayments')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums">{fmtMoney(data.summary.columns.payment_papers)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-2 py-1.5">{st('adjustments')}</td>
                      <td className="px-2 py-1.5 text-end font-bold tabular-nums">—</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="px-2 py-1.5 font-bold">{st('netPayments')}</td>
                      <td className="px-2 py-1.5 text-end font-black tabular-nums">{fmtMoney(data.summary.net_payments)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-blue-200 overflow-hidden">
                <div className="bg-blue-800 text-white px-3 py-1.5 font-bold text-center text-xs">
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
                    <tr className="bg-blue-50">
                      <td className="px-2 py-1.5 font-black">{data.summary.balance_label}</td>
                      <td className="px-2 py-1.5 text-end font-black tabular-nums text-lg">
                        {fmtMoney(
                          parseFloat(data.summary.closing_credit) > 0
                            ? data.summary.closing_credit
                            : data.summary.closing_debit,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
