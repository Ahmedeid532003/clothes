import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  MessageCircle,
  Printer,
  RefreshCw,
  Save,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  installmentFollowUpApi,
  type FollowUpFilters,
  type FollowUpOptions,
  type FollowUpRow,
  type SavedFollowUpList,
} from '@/lib/api/installmentFollowUp';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import {
  CrmDataCard,
  CrmKpiCard,
  CrmTableWrap,
  CrmTh,
  CrmThead,
  CustomersModuleLayout,
} from '@/components/customers/CustomersUi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function Cb({
  checked,
  onChange,
  disabled,
  className,
}: {
  checked: boolean;
  onChange?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-5 w-5 shrink-0 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500/40',
        className,
      )}
      checked={checked}
      disabled={disabled}
      onChange={() => onChange?.()}
    />
  );
}

function NumFilter({
  label,
  op,
  onOp,
  value,
  onValue,
  opAtLeast,
  opAtMost,
  placeholder,
}: {
  label: string;
  op: string;
  onOp: (v: string) => void;
  value: string;
  onValue: (v: string) => void;
  opAtLeast: string;
  opAtMost: string;
  placeholder: string;
}) {
  return (
    <div className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-4 space-y-3">
      <p className="text-base font-bold text-slate-900 leading-snug">{label}</p>
      <select
        className="ifu-field w-full"
        value={op}
        onChange={(e) => onOp(e.target.value)}
      >
        <option value="gte">{opAtLeast}</option>
        <option value="lte">{opAtMost}</option>
      </select>
      <Input
        className="ifu-field h-12 text-base"
        value={value}
        onChange={(e) => onValue(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
      />
    </div>
  );
}

function ChipToggle({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-base font-bold transition',
        active
          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
          : 'border-slate-300 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50',
      )}
    >
      {color ? (
        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: color }} />
      ) : null}
      {label}
    </button>
  );
}

function splitCsv(s?: string): string[] {
  return (s || '').split(',').map((x) => x.trim()).filter(Boolean);
}

export function InstallmentFollowUpPage() {
  const { t } = useLanguage();
  const fu = (k: string) => t(`crm.followUp.${k}` as never);

  const [options, setOptions] = useState<FollowUpOptions | null>(null);
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [summary, setSummary] = useState({ total_late_value: '0', total_balance: '0' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [q, setQ] = useState('');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [listNumber, setListNumber] = useState('');
  const [lawyerName, setLawyerName] = useState('');
  const [lateCountMin, setLateCountMin] = useState('1');
  const [lateCountOp, setLateCountOp] = useState('gte');
  const [lateValue, setLateValue] = useState('');
  const [lateValueOp, setLateValueOp] = useState('gte');
  const [balanceValue, setBalanceValue] = useState('');
  const [balanceOp, setBalanceOp] = useState('gte');
  const [lateMonthsMin, setLateMonthsMin] = useState('');
  const [onlyLate, setOnlyLate] = useState(true);
  const [caseFrom, setCaseFrom] = useState('');
  const [caseTo, setCaseTo] = useState('');
  const [receiptFrom, setReceiptFrom] = useState('');
  const [receiptTo, setReceiptTo] = useState('');
  const [paymentFrom, setPaymentFrom] = useState('');
  const [paymentTo, setPaymentTo] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  const [message, setMessage] = useState('');
  const [bulkGroupId, setBulkGroupId] = useState('');
  const [bulkLawyer, setBulkLawyer] = useState('');
  const [bulkReceiptDate, setBulkReceiptDate] = useState('');
  const [bulkListNumber, setBulkListNumber] = useState('');
  const [saveListNumber, setSaveListNumber] = useState('');
  const [penaltyType, setPenaltyType] = useState('fixed');
  const [penaltyValue, setPenaltyValue] = useState('20');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    installmentFollowUpApi.options().then(setOptions).catch(() => setOptions(null));
  }, []);

  const refreshOptions = useCallback(async () => {
    try {
      setOptions(await installmentFollowUpApi.options());
    } catch {
      /* ignore */
    }
  }, []);

  const applyFiltersFromSnapshot = useCallback((f: FollowUpFilters) => {
    setQ(f.q || '');
    setBranchIds(splitCsv(f.branches));
    setGroupIds(splitCsv(f.groups));
    setRegion(f.region || '');
    setListNumber(f.list_number || '');
    setLawyerName(f.lawyer_name || '');
    setLateCountMin(f.late_count_min || '');
    setLateCountOp(f.late_count_op || 'gte');
    setLateValue(f.late_value || '');
    setLateValueOp(f.late_value_op || 'gte');
    setBalanceValue(f.balance_value || '');
    setBalanceOp(f.balance_op || 'gte');
    setLateMonthsMin(f.late_months_min || '');
    setOnlyLate(f.only_late !== '0');
    setCaseFrom(f.case_from || '');
    setCaseTo(f.case_to || '');
    setReceiptFrom(f.receipt_from || '');
    setReceiptTo(f.receipt_to || '');
    setPaymentFrom(f.payment_from || '');
    setPaymentTo(f.payment_to || '');
    setPeriodFrom(f.period_from || '');
    setPeriodTo(f.period_to || '');
  }, []);

  const buildFilters = useCallback((): FollowUpFilters => {
    const f: FollowUpFilters = { only_late: onlyLate ? '1' : '0' };
    if (q.trim()) f.q = q.trim();
    if (branchIds.length) f.branches = branchIds.join(',');
    if (groupIds.length) f.groups = groupIds.join(',');
    if (region) f.region = region;
    if (listNumber) f.list_number = listNumber;
    if (lawyerName) f.lawyer_name = lawyerName;
    if (lateCountMin) {
      f.late_count_min = lateCountMin;
      f.late_count_op = lateCountOp;
    }
    if (lateValue) {
      f.late_value = lateValue;
      f.late_value_op = lateValueOp;
    }
    if (balanceValue) {
      f.balance_value = balanceValue;
      f.balance_op = balanceOp;
    }
    if (lateMonthsMin) f.late_months_min = lateMonthsMin;
    if (caseFrom) f.case_from = caseFrom;
    if (caseTo) f.case_to = caseTo;
    if (receiptFrom) f.receipt_from = receiptFrom;
    if (receiptTo) f.receipt_to = receiptTo;
    if (paymentFrom) f.payment_from = paymentFrom;
    if (paymentTo) f.payment_to = paymentTo;
    if (periodFrom) f.period_from = periodFrom;
    if (periodTo) f.period_to = periodTo;
    return f;
  }, [
    q, branchIds, groupIds, region, listNumber, lawyerName, lateCountMin, lateCountOp,
    lateValue, lateValueOp, balanceValue, balanceOp, lateMonthsMin, onlyLate,
    caseFrom, caseTo, receiptFrom, receiptTo, paymentFrom, paymentTo, periodFrom, periodTo,
  ]);

  const load = useCallback(async (override?: FollowUpFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await installmentFollowUpApi.list(override ?? buildFilters());
      setRows(res.rows);
      setSummary(res.summary);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  const targetIds = useMemo(() => {
    if (selected.size > 0) return [...selected];
    return rows.map((r) => r.id);
  }, [selected, rows]);

  const toggleBranch = (id: string) => {
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleGroup = (id: string) => {
    setGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const applyBulkUpdate = async () => {
    if (!targetIds.length) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      if (bulkGroupId) patch.customer_group = bulkGroupId;
      if (bulkLawyer) patch.lawyer_name = bulkLawyer;
      if (bulkReceiptDate) patch.receipt_delivery_date = bulkReceiptDate;
      if (bulkListNumber) patch.list_number = bulkListNumber;
      await installmentFollowUpApi.bulkUpdate(targetIds, patch);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const saveFilteredListNumber = async () => {
    if (!saveListNumber.trim() || !rows.length) return;
    setSaving(true);
    try {
      const filters = buildFilters();
      await installmentFollowUpApi.assignListNumber(
        rows.map((r) => r.id),
        saveListNumber.trim(),
        filters,
      );
      setListNumber(saveListNumber.trim());
      await refreshOptions();
      await load({ ...filters, list_number: saveListNumber.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const loadSavedList = (saved: SavedFollowUpList) => {
    const snap = { ...saved.filter_snapshot, list_number: saved.list_number };
    applyFiltersFromSnapshot(snap);
    void load(snap);
  };

  const applyPenalty = async () => {
    if (!targetIds.length) return;
    setSaving(true);
    try {
      await installmentFollowUpApi.applyPenalties(targetIds, penaltyType, penaltyValue);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const sendBulk = async (channel: 'whatsapp' | 'sms') => {
    const ids = rows
      .filter((r) => selected.has(r.id) || selected.size === 0)
      .filter((r) => (channel === 'whatsapp' ? r.whatsapp_enabled : r.sms_enabled))
      .map((r) => r.id);
    if (!ids.length) return;
    setSaving(true);
    try {
      const res = await installmentFollowUpApi.sendReminders(ids, channel, message);
      if (channel === 'whatsapp') {
        res.sent.forEach((s) => {
          const url = s.integration?.whatsapp_url;
          if (url) window.open(url, '_blank', 'noopener');
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `
      <html dir="rtl"><head><title>${fu('title')}</title>
      <style>body{font-family:'Times New Roman',serif;padding:16px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #333;padding:4px;font-size:11px;font-weight:bold}</style></head><body>
      <h2>${fu('title')}</h2><p>${fu('printCount')}: ${rows.length}</p>
      <table><thead><tr>
      ${[fu('colCode'), fu('colName'), fu('colBalance'), fu('colLateCount'), fu('colLateValue'), fu('colBranch'), fu('colLawyer'), fu('colListNumber')]
        .map((h) => `<th>${h}</th>`).join('')}
      </tr></thead><tbody>
      ${rows.map((r) => `<tr>
        <td>${r.code}</td><td>${r.name_ar}</td><td>${r.balance_due}</td>
        <td>${r.late_installment_count}</td><td>${r.late_installment_value}</td>
        <td>${r.branch_name}</td><td>${r.lawyer_name}</td><td>${r.list_number}</td>
      </tr>`).join('')}
      </tbody></table></body></html>`;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const previewRows = selectedRows.length ? selectedRows : rows.slice(0, 8);

  return (
    <CustomersModuleLayout>
      <div className="installment-followup-page space-y-6">
        {/* رأس الصفحة */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{fu('title')}</h1>
              <p className="mt-2 text-base text-slate-600 max-w-3xl leading-relaxed">{fu('desc')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="h-12 px-6 text-base font-bold bg-indigo-600 hover:bg-indigo-700"
                onClick={() => void load()}
                disabled={loading}
              >
                <Search className={cn('h-5 w-5 me-2', loading && 'animate-pulse')} />
                {fu('runQuery')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-5 text-base font-bold"
                onClick={printReport}
                disabled={!rows.length}
              >
                <Printer className="h-5 w-5 me-2" />
                {fu('print')}
              </Button>
            </div>
          </div>
        </div>

        {/* ملخص سريع */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CrmKpiCard label={fu('totalLate')} value={fmtMoney(summary.total_late_value)} tone="danger" />
          <CrmKpiCard label={fu('totalBalance')} value={fmtMoney(summary.total_balance)} tone="warn" />
          <CrmKpiCard label={fu('selectedTitle')} value={selected.size || rows.length} tone="info" />
          <CrmKpiCard label={fu('printCount')} value={rows.length} />
        </div>

        {error ? (
          <div className="flex items-center gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 text-base font-bold text-red-900">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            {error}
          </div>
        ) : null}

        {/* تعديل جماعي — أعلى الشاشة */}
        <section className="sticky top-2 z-20 rounded-2xl border-2 border-indigo-300 bg-gradient-to-l from-indigo-50 to-white p-5 shadow-lg space-y-4">
          <p className="text-lg font-bold text-indigo-950">{fu('bulkBarTitle')}</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <label className="ifu-label">{fu('bulkGroup')}</label>
              <select className="ifu-field w-full" value={bulkGroupId} onChange={(e) => setBulkGroupId(e.target.value)}>
                <option value="">{fu('noChange')}</option>
                {(options?.groups || []).map((g) => (
                  <option key={g.id} value={g.id}>{g.name_ar}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="ifu-label">{fu('bulkLawyer')}</label>
              <Input className="ifu-field h-12 text-base" value={bulkLawyer} onChange={(e) => setBulkLawyer(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="ifu-label">{fu('bulkReceiptDate')}</label>
              <Input type="date" className="ifu-field h-12 text-base" value={bulkReceiptDate} onChange={(e) => setBulkReceiptDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="ifu-label">{fu('bulkListNumber')}</label>
              <Input className="ifu-field h-12 text-base" value={bulkListNumber} onChange={(e) => setBulkListNumber(e.target.value)} placeholder={fu('listNumberPlaceholder')} />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full h-12 text-base font-bold bg-indigo-700 hover:bg-indigo-800"
                disabled={saving || !rows.length}
                onClick={() => void applyBulkUpdate()}
              >
                {fu('applyBulk')}
              </Button>
            </div>
          </div>
        </section>

        {/* الليستات المحفوظة */}
        {(options?.saved_lists?.length ?? 0) > 0 ? (
          <section className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bookmark className="h-6 w-6 text-violet-700" />
              <h2 className="text-lg font-bold text-violet-950">{fu('savedListsTitle')}</h2>
            </div>
            <p className="text-sm text-violet-800">{fu('savedListsHint')}</p>
            <div className="flex flex-wrap gap-3">
              {(options?.saved_lists || []).map((saved) => (
                <button
                  key={saved.id}
                  type="button"
                  onClick={() => loadSavedList(saved)}
                  className={cn(
                    'rounded-xl border-2 px-4 py-3 text-start transition hover:shadow-md max-w-md',
                    listNumber === saved.list_number
                      ? 'border-violet-600 bg-violet-100 shadow-md'
                      : 'border-violet-200 bg-white hover:border-violet-400',
                  )}
                >
                  <p className="text-base font-bold text-slate-900">{saved.list_number}</p>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{saved.filter_summary}</p>
                  <p className="mt-2 text-xs font-bold text-violet-700">
                    {saved.customer_count} {fu('customersCount')}
                    {saved.updated_at ? ` · ${saved.updated_at.slice(0, 10)}` : ''}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* الفلاتر — عرض كامل */}
        <section className="rounded-2xl border-2 border-indigo-100 bg-white p-6 shadow-md space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">{fu('filtersTitle')}</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <label className="ifu-label">{fu('search')}</label>
              <Input
                className="ifu-field h-12 text-base"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={fu('search')}
              />
            </div>
            <div className="space-y-2">
              <label className="ifu-label">{fu('region')}</label>
              <select className="ifu-field w-full" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">{fu('all')}</option>
                {(options?.regions || []).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="ifu-label">{fu('listNumberFilter')}</label>
              <select className="ifu-field w-full" value={listNumber} onChange={(e) => setListNumber(e.target.value)}>
                <option value="">{fu('all')}</option>
                {(options?.list_numbers || []).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ifu-label">{fu('lawyerFilter')}</label>
              <Input className="ifu-field h-12 text-base" value={lawyerName} onChange={(e) => setLawyerName(e.target.value)} />
            </div>
            <label className="flex items-center gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-4 cursor-pointer self-end">
              <Cb checked={onlyLate} onChange={() => setOnlyLate((v) => !v)} />
              <span className="text-base font-bold text-amber-950">{fu('onlyLate')}</span>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <NumFilter
              label={fu('lateCount')}
              op={lateCountOp}
              onOp={setLateCountOp}
              value={lateCountMin}
              onValue={setLateCountMin}
              opAtLeast={fu('opAtLeast')}
              opAtMost={fu('opAtMost')}
              placeholder={fu('filterValuePh')}
            />
            <NumFilter
              label={fu('lateValue')}
              op={lateValueOp}
              onOp={setLateValueOp}
              value={lateValue}
              onValue={setLateValue}
              opAtLeast={fu('opAtLeast')}
              opAtMost={fu('opAtMost')}
              placeholder={fu('filterValuePh')}
            />
            <NumFilter
              label={fu('balance')}
              op={balanceOp}
              onOp={setBalanceOp}
              value={balanceValue}
              onValue={setBalanceValue}
              opAtLeast={fu('opAtLeast')}
              opAtMost={fu('opAtMost')}
              placeholder={fu('filterValuePh')}
            />
            <div className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <p className="text-base font-bold text-slate-900">{fu('lateMonths')}</p>
              <p className="text-sm text-slate-600">{fu('opAtLeast')}</p>
              <Input
                className="ifu-field h-12 text-base"
                value={lateMonthsMin}
                onChange={(e) => setLateMonthsMin(e.target.value)}
                placeholder={fu('filterValuePh')}
                inputMode="numeric"
              />
            </div>
          </div>

          {(options?.branches?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              <p className="ifu-label">{fu('branches')}</p>
              <p className="text-sm text-slate-500">{fu('branchesHint')}</p>
              <div className="flex flex-wrap gap-2">
                {(options?.branches || []).map((b) => (
                  <ChipToggle
                    key={b.id}
                    active={branchIds.includes(b.id)}
                    label={b.name_ar}
                    onClick={() => toggleBranch(b.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {(options?.groups?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              <p className="ifu-label">{fu('groups')}</p>
              <p className="text-sm text-slate-500">{fu('groupsHint')}</p>
              <div className="flex flex-wrap gap-2">
                {(options?.groups || []).map((g) => (
                  <ChipToggle
                    key={g.id}
                    active={groupIds.includes(g.id)}
                    label={g.name_ar}
                    color={g.display_color}
                    onClick={() => toggleGroup(g.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <p className="text-base font-bold text-slate-900">{fu('caseDatesTitle')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="ifu-label">{fu('caseFrom')}</label>
                <Input type="date" className="ifu-field h-12 text-base" value={caseFrom} onChange={(e) => setCaseFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="ifu-label">{fu('caseTo')}</label>
                <Input type="date" className="ifu-field h-12 text-base" value={caseTo} onChange={(e) => setCaseTo(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <p className="text-base font-bold text-slate-900">{fu('receiptDatesTitle')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="ifu-label">{fu('receiptFrom')}</label>
                <Input type="date" className="ifu-field h-12 text-base" value={receiptFrom} onChange={(e) => setReceiptFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="ifu-label">{fu('receiptTo')}</label>
                <Input type="date" className="ifu-field h-12 text-base" value={receiptTo} onChange={(e) => setReceiptTo(e.target.value)} />
              </div>
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-5 w-5 me-2', loading && 'animate-spin')} />
            {fu('runQuery')}
          </Button>
        </section>

        {/* إجراءات */}
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-indigo-600" />
              {fu('bulkTitle')}
            </h2>

            <div className="space-y-2">
              <label className="ifu-label">{fu('messageText')}</label>
              <textarea
                className="w-full min-h-[120px] rounded-xl border-2 border-slate-200 bg-white p-4 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={fu('messagePlaceholder')}
              />
            </div>

            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-5 space-y-3">
              <label className="ifu-label">{fu('saveListNumber')}</label>
              <p className="text-sm text-violet-800">{fu('savedListsHint')}</p>
              <Input className="ifu-field h-12 text-base" value={saveListNumber} onChange={(e) => setSaveListNumber(e.target.value)} placeholder={fu('listNumberPlaceholder')} />
              <Button variant="outline" className="w-full h-12 text-base font-bold border-violet-400" disabled={saving || !rows.length} onClick={() => void saveFilteredListNumber()}>
                <Save className="h-5 w-5 me-2" />
                {fu('saveListBtn')}
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="h-12 px-5 text-base font-bold bg-emerald-600 hover:bg-emerald-700" disabled={saving} onClick={() => void sendBulk('whatsapp')}>
                <MessageCircle className="h-5 w-5 me-2" />
                {fu('sendWhatsapp')}
              </Button>
              <Button className="h-12 px-5 text-base font-bold" disabled={saving} onClick={() => void sendBulk('sms')}>
                <Send className="h-5 w-5 me-2" />
                {fu('sendSms')}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-600" />
              {fu('selectedTitle')}
            </h2>

            <div className="rounded-xl border-2 border-slate-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-slate-100 text-sm font-bold text-slate-700">
                <div className="px-4 py-3">{fu('colName')}</div>
                <div className="px-4 py-3">{fu('colCode')}</div>
                <div className="px-4 py-3">{fu('colMobile')}</div>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                {previewRows.length ? (
                  previewRows.map((r) => (
                    <div key={r.id} className="grid grid-cols-3 gap-2 px-4 py-3 text-base text-slate-900 hover:bg-slate-50">
                      <span className="font-bold truncate">{r.name_ar}</span>
                      <span className="text-slate-600">{r.code}</span>
                      <span className="text-slate-600">{r.phone || r.whatsapp || '—'}</span>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-8 text-center text-base text-slate-500">{fu('empty')}</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-4">
              <p className="text-base font-bold text-amber-950">{fu('penaltyTitle')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="ifu-field w-full" value={penaltyType} onChange={(e) => setPenaltyType(e.target.value)}>
                  <option value="fixed">{fu('penaltyFixed')}</option>
                  <option value="percent">{fu('penaltyPercent')}</option>
                </select>
                <Input className="ifu-field h-12 text-base" value={penaltyValue} onChange={(e) => setPenaltyValue(e.target.value)} />
              </div>
              <Button className="w-full h-12 text-base font-bold bg-amber-600 hover:bg-amber-700" disabled={saving} onClick={() => void applyPenalty()}>
                {fu('applyPenalty')}
              </Button>
            </div>
          </section>
        </div>

        {/* جدول النتائج */}
        <CrmDataCard title={fu('resultsTitle')} noPadding>
          <CrmTableWrap minWidth="1400px">
            <CrmThead>
              <CrmTh>
                <Cb
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </CrmTh>
              <CrmTh>{fu('colName')}</CrmTh>
              <CrmTh>{fu('colCode')}</CrmTh>
              <CrmTh align="end">{fu('colBalance')}</CrmTh>
              <CrmTh>{fu('colFirstLate')}</CrmTh>
              <CrmTh align="end">{fu('colLateValue')}</CrmTh>
              <CrmTh>{fu('colLateCount')}</CrmTh>
              <CrmTh align="end">{fu('colDueValue')}</CrmTh>
              <CrmTh>{fu('colDueCount')}</CrmTh>
              <CrmTh>{fu('colBranch')}</CrmTh>
              <CrmTh>{fu('colLawyer')}</CrmTh>
              <CrmTh>{fu('colListNumber')}</CrmTh>
              <CrmTh>{fu('colLastPay')}</CrmTh>
              <CrmTh>{fu('colPenaltyType')}</CrmTh>
              <CrmTh align="end">{fu('colPenaltyValue')}</CrmTh>
              <CrmTh>{fu('colSms')}</CrmTh>
            </CrmThead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={17} className="ifu-td py-20 text-center text-base text-slate-500">
                    {t('inventory.loading')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="ifu-td py-20 text-center text-base text-slate-500">
                    {fu('empty')}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      'border-t',
                      r.late_installment_count > 0 ? 'bg-red-50/80' : 'hover:bg-slate-50/60',
                    )}
                  >
                    <td className="ifu-td w-12">
                      <Cb checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} />
                    </td>
                    <td className="ifu-td">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{r.name_ar}</span>
                        {r.tier_label ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                            style={{ background: r.tier_color || '#64748b' }}
                          >
                            {r.tier_label}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="ifu-td text-slate-600">{r.code}</td>
                    <td className="ifu-td text-end tabular-nums font-bold">{fmtMoney(r.balance_due)}</td>
                    <td className="ifu-td text-slate-600">{r.first_late_due_date || '—'}</td>
                    <td className="ifu-td text-end tabular-nums font-bold text-red-700">
                      {fmtMoney(r.late_installment_value)}
                    </td>
                    <td className="ifu-td text-center">
                      <span
                        className={cn(
                          'inline-flex min-w-[2rem] justify-center rounded-full px-2.5 py-1 text-sm font-bold',
                          r.late_installment_count > 0 ? 'bg-red-200 text-red-900' : 'bg-slate-200 text-slate-700',
                        )}
                      >
                        {r.late_installment_count}
                      </span>
                    </td>
                    <td className="ifu-td text-end tabular-nums">{fmtMoney(r.due_installment_value)}</td>
                    <td className="ifu-td text-center">{r.due_installment_count}</td>
                    <td className="ifu-td">{r.branch_name || '—'}</td>
                    <td className="ifu-td">{r.lawyer_name || '—'}</td>
                    <td className="ifu-td">{r.list_number || '—'}</td>
                    <td className="ifu-td text-slate-600">{r.last_payment_date || '—'}</td>
                    <td className="ifu-td text-slate-600">{r.late_penalty_type || '—'}</td>
                    <td className="ifu-td text-end tabular-nums">{r.late_penalty_value}</td>
                    <td className="ifu-td">
                      <Cb checked={r.sms_enabled} disabled />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </CrmTableWrap>
        </CrmDataCard>
      </div>
    </CustomersModuleLayout>
  );
}
