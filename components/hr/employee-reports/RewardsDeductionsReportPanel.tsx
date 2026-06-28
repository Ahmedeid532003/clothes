import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, DollarSign, Download, Gift, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import { bonusesApi, deductionsApi, type BonusRow, type DeductionRow } from '@/lib/api/hr-payroll';
import { entityName } from '@/lib/entity-name';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import { ErpTablePagination } from '@/components/erp/ErpTablePagination';
import { useTablePagination } from '@/components/erp/useTablePagination';

type CombinedRow = {
  id: string;
  kind: 'bonus' | 'deduction';
  employee_code: string;
  employee_name: string;
  item_name: string;
  amount: string;
  txn_date: string;
  notes: string;
};

function defaultMonthRange() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function fmtMoney(value: string | number) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function RewardsDeductionsReportPanel() {
  const { t, isRtl } = useLanguage();
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [branchId, setBranchId] = useState('');
  const [{ year, month }, setPeriod] = useState(defaultMonthRange);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, d, br] = await Promise.all([
        bonusesApi.list(year, month),
        deductionsApi.list(year, month),
        fetchBranches(),
      ]);
      setBonuses(b);
      setDeductions(d);
      setBranches(br.filter((x) => x.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setBonuses([]);
      setDeductions([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const combined = useMemo<CombinedRow[]>(() => {
    const bonusRows: CombinedRow[] = bonuses.map((r) => ({
      id: `b-${r.id}`,
      kind: 'bonus',
      employee_code: r.employee_code,
      employee_name: r.employee_name,
      item_name: r.bonus_item_name || r.description,
      amount: r.amount,
      txn_date: r.bonus_date,
      notes: r.notes || '',
    }));
    const deductionRows: CombinedRow[] = deductions.map((r) => ({
      id: `d-${r.id}`,
      kind: 'deduction',
      employee_code: r.employee_code,
      employee_name: r.employee_name,
      item_name: r.deduction_item_name || r.description,
      amount: r.amount,
      txn_date: r.deduction_date,
      notes: r.notes || '',
    }));
    return [...bonusRows, ...deductionRows].sort((a, b) => b.txn_date.localeCompare(a.txn_date));
  }, [bonuses, deductions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return combined.filter((row) => {
      if (!q) return true;
      const hay = [row.employee_code, row.employee_name, row.item_name, row.txn_date, row.notes]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [combined, query]);

  const pagination = useTablePagination(filtered);

  const stats = useMemo(() => {
    const bonusTotal = bonuses.reduce((s, r) => s + Number(r.amount || 0), 0);
    const deductTotal = deductions.reduce((s, r) => s + Number(r.amount || 0), 0);
    return { bonusTotal, deductTotal, count: filtered.length };
  }, [bonuses, deductions, filtered.length]);

  const months = isRtl
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <div className="emp-rep-filters-panel">
        <div className="emp-rep-filters-row">
          <div className="emp-rep-date-group">
            <label>
              <CalendarDays className="h-3.5 w-3.5" />
              {isRtl ? 'الشهر' : 'Month'}
            </label>
            <select value={month} onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}>
              {months.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="emp-rep-date-group">
            <label>
              <CalendarDays className="h-3.5 w-3.5" />
              {isRtl ? 'العام' : 'Year'}
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
            />
          </div>
          <button type="button" className="emp-rep-export-btn">
            <Download className="h-4 w-4" />
            {isRtl ? 'تصدير البيانات' : 'Export data'}
          </button>
          <div className="emp-rep-branch-wrap">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{isRtl ? 'كل الفروع' : 'All branches'}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {entityName(b)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="emp-rep-toolbar">
          <ErpSearchBar
            className="emp-rep-search-bar"
            value={query}
            onChange={setQuery}
            placeholder={isRtl ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or employee code...'}
            showAdvanced={false}
          />
        </div>
      </div>

      <div className="emp-rep-stats-row">
        <div className="emp-rep-stat is-navy">
          <span className="emp-rep-stat-icon">
            <Gift className="h-5 w-5" />
          </span>
          <div className="emp-rep-stat-text">
            <span>{isRtl ? 'إجمالي المكافآت' : 'Total bonuses'}</span>
            <strong>EGP {fmtMoney(stats.bonusTotal)}</strong>
          </div>
        </div>
        <div className="emp-rep-stat is-white">
          <span className="emp-rep-stat-icon is-red">
            <TrendingDown className="h-5 w-5" />
          </span>
          <div className="emp-rep-stat-text">
            <span>{isRtl ? 'إجمالي الخصومات' : 'Total deductions'}</span>
            <strong>EGP {fmtMoney(stats.deductTotal)}</strong>
          </div>
        </div>
        <div className="emp-rep-stat is-white">
          <span className="emp-rep-stat-icon is-blue">
            <DollarSign className="h-5 w-5" />
          </span>
          <div className="emp-rep-stat-text">
            <span>{isRtl ? 'عدد الحركات' : 'Transactions'}</span>
            <strong>{stats.count}</strong>
          </div>
        </div>
      </div>

      <div className="emp-rep-table-scroll">
        <table className="emp-rep-table">
          <thead>
            <tr>
              <th>{isRtl ? 'النوع' : 'Type'}</th>
              <th>{isRtl ? 'التاريخ' : 'Date'}</th>
              <th>{isRtl ? 'كود الموظف' : 'Code'}</th>
              <th>{isRtl ? 'اسم الموظف' : 'Employee'}</th>
              <th>{isRtl ? 'البند' : 'Item'}</th>
              <th>{isRtl ? 'المبلغ' : 'Amount'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="emp-rep-empty">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : pagination.pagedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="emp-rep-empty">
                  {isRtl ? 'لا توجد مكافآت أو خصومات' : 'No bonuses or deductions'}
                </td>
              </tr>
            ) : (
              pagination.pagedRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className={`emp-rep-txn-pill is-${row.kind}`}>
                      {row.kind === 'bonus'
                        ? isRtl
                          ? 'مكافأة'
                          : 'Bonus'
                        : isRtl
                          ? 'خصم'
                          : 'Deduction'}
                    </span>
                  </td>
                  <td>{row.txn_date}</td>
                  <td className="emp-rep-code">{row.employee_code || '—'}</td>
                  <td>{row.employee_name}</td>
                  <td>{row.item_name || '—'}</td>
                  <td className={row.kind === 'bonus' ? 'emp-rep-salary' : 'emp-rep-deduct'}>
                    EGP {fmtMoney(row.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ErpTablePagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        shown={pagination.shown}
        total={pagination.total}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </>
  );
}
