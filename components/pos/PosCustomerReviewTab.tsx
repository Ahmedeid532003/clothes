import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Banknote,
  FileText,
  Layers,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  customersApi,
  fetchCustomerMeta,
  type CustomerDto,
  type CustomerGroupDto,
  type CustomerPurchaseItem,
  type CustomerTypeDto,
} from '@/lib/api/customers';
import { fetchPosCustomerReview, type PosCustomerReviewRow } from '@/lib/api/pos';
import {
  receivablesApi,
  type InstallmentCollectionLine,
  type InstallmentContract,
} from '@/lib/api/receivables';
import {
  COLLECTION_TIER_PRESETS,
  GROUP_COLOR_PRESETS,
  contrastText,
  type CollectionTier,
} from '@/lib/customers/collectionTier';
import { canPerformAction } from '@/lib/permissions/access';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtMoney, StatusBadge } from '@/components/accounting/AccountingUi';
import { SmartCustomerForm } from '@/components/customers/SmartCustomerForm';
import { CustomerSmartActions } from '@/components/customers/CustomerSmartActions';
import { CustomerAccountStatementReport } from '@/components/customers/CustomerAccountStatementReport';
import { crmSelectClass } from '@/components/customers/CustomersUi';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

type Canvas = 'items' | 'profile' | 'statement' | 'collect' | 'restructure' | 'quickEdit' | null;

function fmtMonth(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' });
  } catch {
    return iso;
  }
}

function fmtPaidMonth(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' });
  } catch {
    return iso.slice(0, 10);
  }
}

function monthKey(iso: string) {
  const d = new Date(iso.slice(0, 10));
  return d.getFullYear() * 12 + d.getMonth();
}

function isPaidLate(dueDate: string, paidAt?: string | null) {
  if (!paidAt) return false;
  return monthKey(paidAt) > monthKey(dueDate);
}

function isPaidOnTime(dueDate: string, paidAt?: string | null) {
  if (!paidAt) return false;
  return monthKey(paidAt) === monthKey(dueDate);
}

function PosSideCanvas({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  extraWide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  extraWide?: boolean;
}) {
  const { isRtl } = useLanguage();
  if (!open) return null;

  const sideClass = isRtl ? 'left-0 border-r' : 'right-0 border-l';
  const widthClass = extraWide
    ? 'max-w-[min(100vw,96vw)]'
    : wide
      ? 'max-w-[min(100vw,85vw)]'
      : 'max-w-[min(100vw,42rem)]';

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[248] bg-slate-900/45 backdrop-blur-[2px]"
        onClick={onClose}
        role="presentation"
      />
      <aside
        className={`fixed top-0 ${sideClass} z-[250] flex h-[100dvh] w-full ${widthClass} flex-col overflow-hidden border-slate-200 bg-white shadow-[-12px_0_48px_rgba(0,0,0,0.18)]`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-gradient-to-b from-blue-900 to-blue-800 px-4 py-3 text-white">
          <h2 className="min-w-0 truncate font-black text-base">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 hover:bg-white/15"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? <div className="shrink-0 border-t px-4 py-3">{footer}</div> : null}
      </aside>
    </>,
    document.body,
  );
}

export function PosCustomerReviewTab({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<PosCustomerReviewRow[]>([]);
  const [groups, setGroups] = useState<CustomerGroupDto[]>([]);
  const [types, setTypes] = useState<CustomerTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [canvas, setCanvas] = useState<Canvas>(null);

  const canCollect = canPerformAction(user, 'installment-collection', 'update');
  const canRestructure = canPerformAction(user, 'customer-installments', 'update');
  const canEditCustomer = canPerformAction(user, 'customers', 'update');
  const canDiscount = user?.is_owner || canPerformAction(user, 'installment-collection', 'update');

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? null,
    [customers, selectedId],
  );

  const selectedAsDto = selected as unknown as CustomerDto | null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, meta] = await Promise.all([
        fetchPosCustomerReview(search),
        fetchCustomerMeta(),
      ]);
      setCustomers(rows);
      setGroups(meta.groups);
      setTypes(meta.types);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [search, onError]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const actionsDisabled = !selected;

  const tierBadge = (c: PosCustomerReviewRow) => {
    const preset = COLLECTION_TIER_PRESETS[c.tier];
    const bg = c.tier_color || preset?.bg || '';
    const hasBg = !!bg;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
          hasBg ? '' : 'border border-slate-200 bg-white'
        }`}
        style={
          hasBg
            ? { backgroundColor: bg, color: contrastText(bg) }
            : { color: preset?.text || '#334155' }
        }
        title={t(`pos.posReview.tierSource_${c.tier_source}`)}
      >
        {c.tier_label}
        {c.tier_source === 'auto' ? (
          <span className="opacity-70 text-[9px]">A</span>
        ) : null}
      </span>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/50">
      <div className="shrink-0 border-b bg-white px-4 py-3 shadow-sm">
        <div className="relative mb-3">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
          <Input
            className="h-11 ps-10 text-base font-medium bg-gradient-to-l from-blue-50 to-white border-blue-300 focus:border-blue-500"
            placeholder={t('pos.posReview.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={actionsDisabled} onClick={() => setCanvas('items')}>
            <Package className="h-4 w-4 me-1" />
            {t('pos.posReview.viewItems')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={actionsDisabled}
            onClick={() => setCanvas('profile')}
          >
            <User className="h-4 w-4 me-1" />
            {t('pos.posReview.viewProfile')}
          </Button>
          <Button size="sm" variant="outline" disabled={actionsDisabled} onClick={() => setCanvas('statement')}>
            <FileText className="h-4 w-4 me-1" />
            {t('pos.posReview.viewStatement')}
          </Button>
          <Button
            size="sm"
            className="bg-blue-700 hover:bg-blue-800"
            disabled={actionsDisabled || !canCollect}
            onClick={() => setCanvas('collect')}
          >
            <Banknote className="h-4 w-4 me-1" />
            {t('pos.posReview.collectInstallments')}
          </Button>
          {canRestructure ? (
            <Button
              size="sm"
              variant="outline"
              disabled={actionsDisabled}
              onClick={() => setCanvas('restructure')}
            >
              <Layers className="h-4 w-4 me-1" />
              {t('pos.posReview.restructure')}
            </Button>
          ) : null}
          {canEditCustomer ? (
            <Button
              size="sm"
              variant="outline"
              disabled={actionsDisabled}
              onClick={() => setCanvas('quickEdit')}
            >
              <Pencil className="h-4 w-4 me-1" />
              {t('pos.posReview.editNotesTier')}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={load} className="ms-auto">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="bg-gradient-to-b from-[#1e40af] to-[#1d4ed8] text-white text-xs">
                <th className="py-2.5 px-2 w-10 text-center" title={t('pos.posReview.selectCustomer')}>
                  ◉
                </th>
                <th className="py-2.5 px-3 text-start">{t('inventory.code')}</th>
                <th className="py-2.5 px-3 text-start">{t('pos.posReview.customerName')}</th>
                <th className="py-2.5 px-3 text-end">{t('pos.posReview.balance')}</th>
                <th className="py-2.5 px-3 text-start min-w-[180px]">{t('inventory.notes')}</th>
                <th className="py-2.5 px-3 text-center">{t('pos.posReview.customerGroup')}</th>
                <th className="py-2.5 px-3 text-start">{t('pos.posReview.spouse')}</th>
                <th className="py-2.5 px-3 text-start">{t('pos.posReview.guarantor')}</th>
                <th className="py-2.5 px-3 text-start">{t('pos.posReview.phone')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500">
                    {t('inventory.loading')}
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500">
                    {t('inventory.empty')}
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <tr
                      key={c.id}
                      className={`border-t cursor-pointer transition-all duration-150 ${
                        active
                          ? 'bg-gradient-to-l from-orange-200 via-amber-100 to-yellow-50 shadow-[inset_4px_0_0_0_#ea580c] ring-2 ring-inset ring-orange-400'
                          : 'hover:bg-sky-50/60'
                      }`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className={`py-2.5 px-2 text-center ${active ? 'bg-orange-300/40' : ''}`}>
                        <input
                          type="radio"
                          name="pos-customer"
                          checked={active}
                          onChange={() => setSelectedId(c.id)}
                          className="h-5 w-5 accent-orange-600 cursor-pointer"
                        />
                      </td>
                      <td className={`py-2.5 px-3 font-mono text-xs font-bold ${active ? 'text-orange-900' : 'text-slate-800'}`}>
                        {c.code}
                      </td>
                      <td className={`py-2.5 px-3 font-semibold ${active ? 'text-orange-950 text-base' : 'text-slate-900'}`}>
                        {c.name_ar}
                      </td>
                      <td className={`py-2.5 px-3 text-end tabular-nums font-black ${active ? 'text-red-800 text-base' : 'text-slate-900'}`}>
                        {fmtMoney(c.balance_due)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-xs max-w-[220px] truncate ${active ? 'text-orange-900' : 'text-slate-600'}`}
                        title={c.notes || ''}
                      >
                        {c.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">{tierBadge(c)}</td>
                      <td className={`py-2.5 px-3 text-xs ${active ? 'font-medium text-orange-900' : ''}`}>
                        {c.spouse_name || '—'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-xs max-w-[160px] truncate ${active ? 'font-medium text-orange-900' : 'text-slate-600'}`}
                        title={c.guarantor_summary || c.guarantor_name || ''}
                      >
                        {c.guarantor_summary || c.guarantor_name || '—'}
                      </td>
                      <td className={`py-2.5 px-3 font-mono text-xs ${active ? 'font-bold text-orange-900' : ''}`}>
                        {c.phone || c.whatsapp || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {selected ? (
          <p className="mt-2 text-xs text-slate-500 px-1">
            {t('pos.posReview.tierHint')}: {selected.tier_label} ({t(`pos.posReview.tierSource_${selected.tier_source}`)})
            {selected.late_installment_count ? ` · ${selected.late_installment_count} ${t('pos.posReview.lateInstallments')}` : ''}
          </p>
        ) : null}
      </div>

      {selectedAsDto && canvas === 'items' && (
        <PurchaseItemsCanvas customer={selectedAsDto} onClose={() => setCanvas(null)} />
      )}
      {selectedAsDto && canvas === 'profile' && (
        <CustomerProfileCanvas
          customer={selectedAsDto}
          groups={groups}
          types={types}
          canEdit={canEditCustomer}
          onClose={() => setCanvas(null)}
          onSaved={() => {
            load();
            onMessage(t('pos.posReview.profileSaved'));
          }}
          onError={onError}
        />
      )}
      {selectedAsDto && canvas === 'statement' && (
        <StatementCanvas customer={selectedAsDto} onClose={() => setCanvas(null)} />
      )}
      {selectedAsDto && canvas === 'collect' && (
        <CollectCanvas
          customer={selectedAsDto}
          canDiscount={canDiscount}
          onClose={() => setCanvas(null)}
          onMessage={onMessage}
          onError={onError}
        />
      )}
      {selectedAsDto && canvas === 'restructure' && (
        <RestructureCanvas
          customer={selectedAsDto}
          onClose={() => setCanvas(null)}
          onMessage={onMessage}
          onError={onError}
        />
      )}
      {selected && canvas === 'quickEdit' && (
        <QuickEditCanvas
          customer={selected}
          groups={groups}
          onClose={() => setCanvas(null)}
          onSaved={() => {
            load();
            onMessage(t('pos.posReview.profileSaved'));
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function QuickEditCanvas({
  customer,
  groups,
  onClose,
  onSaved,
  onError,
}: {
  customer: PosCustomerReviewRow;
  groups: CustomerGroupDto[];
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const { t } = useLanguage();
  const [notes, setNotes] = useState(customer.notes || '');
  const [tier, setTier] = useState<CollectionTier>(
    (String(customer.profile_data?.collection_tier || 'auto') as CollectionTier) || 'auto',
  );
  const [groupId, setGroupId] = useState(customer.customer_group);
  const [groupColor, setGroupColor] = useState(customer.customer_group_color || '#4F46E5');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const detail = await customersApi.get(customer.id);
      await customersApi.update(customer.id, {
        notes,
        customer_group: groupId,
        profile_data: {
          ...detail.profile_data,
          collection_tier: tier,
        },
      });
      const g = groups.find((x) => x.id === groupId);
      if (g && groupColor !== g.display_color) {
        await import('@/lib/api/customers').then(({ customerGroupsApi }) =>
          customerGroupsApi.update(groupId, { display_color: groupColor }),
        );
      }
      onSaved();
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PosSideCanvas
      open
      title={`${t('pos.posReview.editNotesTier')} — ${customer.name_ar}`}
      onClose={onClose}
      footer={
        <Button onClick={save} disabled={saving} className="bg-emerald-700 hover:bg-emerald-800">
          <Save className="h-4 w-4 me-1" />
          {t('inventory.save')}
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-bold">{t('pos.posReview.collectionTier')}</label>
          <select
            className={`${ERP_NATIVE_SELECT} mt-1`}
            value={tier}
            onChange={(e) => setTier(e.target.value as CollectionTier)}
          >
            <option value="auto">{t('pos.posReview.tierAuto')}</option>
            <option value="normal">{COLLECTION_TIER_PRESETS.normal.labelAr}</option>
            <option value="excellent">{COLLECTION_TIER_PRESETS.excellent.labelAr}</option>
            <option value="black">{COLLECTION_TIER_PRESETS.black.labelAr}</option>
            <option value="lawyer">{COLLECTION_TIER_PRESETS.lawyer.labelAr}</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">{t('pos.posReview.tierAutoHint')}</p>
        </div>
        <div>
          <label className="text-sm font-bold">{t('pos.posReview.customerGroup')}</label>
          <select
            className={`${ERP_NATIVE_SELECT} mt-1`}
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              const g = groups.find((x) => x.id === e.target.value);
              if (g?.display_color) setGroupColor(g.display_color);
            }}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name_ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-bold">{t('pos.posReview.groupColor')}</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {GROUP_COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`h-8 w-8 rounded-lg border-2 ${groupColor === color ? 'border-blue-600 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color || '#fff' }}
                onClick={() => setGroupColor(color)}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-bold">{t('inventory.notes')}</label>
          <textarea
            className="mt-1 w-full min-h-[120px] rounded-lg border px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('pos.posReview.notesPlaceholder')}
          />
        </div>
      </div>
    </PosSideCanvas>
  );
}

function groupPurchaseItems(rows: CustomerPurchaseItem[]) {
  const map = new Map<
    string,
    {
      sale_id: string;
      sale_code: string;
      sale_date: string;
      items: CustomerPurchaseItem[];
      total: number;
      qty: number;
    }
  >();
  for (const row of rows) {
    const existing = map.get(row.sale_id);
    const qty = parseFloat(row.quantity) || 0;
    const total = parseFloat(row.line_total) || 0;
    if (existing) {
      existing.items.push(row);
      existing.total += total;
      existing.qty += qty;
    } else {
      map.set(row.sale_id, {
        sale_id: row.sale_id,
        sale_code: row.sale_code,
        sale_date: row.sale_date,
        items: [row],
        total,
        qty,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.sale_date.localeCompare(a.sale_date));
}

function fmtSaleDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function PurchaseItemsCanvas({ customer, onClose }: { customer: CustomerDto; onClose: () => void }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CustomerPurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customersApi.purchaseItems(customer.id).then(setRows).finally(() => setLoading(false));
  }, [customer.id]);

  const invoices = useMemo(() => groupPurchaseItems(rows), [rows]);
  const summary = useMemo(() => {
    let totalQty = 0;
    let grandTotal = 0;
    for (const inv of invoices) {
      totalQty += inv.qty;
      grandTotal += inv.total;
    }
    return { count: rows.length, invoiceCount: invoices.length, totalQty, grandTotal };
  }, [invoices, rows.length]);

  return (
    <PosSideCanvas open title={`${t('pos.posReview.viewItems')} — ${customer.name_ar}`} onClose={onClose} wide>
      {loading ? (
        <p>{t('inventory.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500 py-8 text-center">{t('inventory.empty')}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border bg-blue-50 p-3 text-center">
              <p className="text-[10px] text-slate-500">{t('pos.posReview.itemsByInvoice')}</p>
              <p className="text-xl font-black text-blue-900">{summary.invoiceCount}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 text-center">
              <p className="text-[10px] text-slate-500">{t('pos.posReview.totalItems')}</p>
              <p className="text-xl font-black">{summary.count}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 text-center">
              <p className="text-[10px] text-slate-500">{t('pos.posReview.totalQty')}</p>
              <p className="text-xl font-black">{summary.totalQty}</p>
            </div>
            <div className="rounded-lg border bg-emerald-50 p-3 text-center">
              <p className="text-[10px] text-slate-500">{t('pos.posReview.grandTotal')}</p>
              <p className="text-xl font-black text-emerald-800">{fmtMoney(String(summary.grandTotal))}</p>
            </div>
          </div>

          {invoices.map((inv) => (
            <div key={inv.sale_id} className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-l from-blue-800 to-blue-700 px-4 py-2.5 text-white">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm font-black">{inv.sale_code}</span>
                  <span className="text-xs opacity-90">{fmtSaleDate(inv.sale_date)}</span>
                  <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                    {inv.items.length} {t('pos.posReview.invoiceLines')}
                  </span>
                </div>
                <span className="font-black tabular-nums">
                  {t('pos.posReview.invoiceTotal')}: {fmtMoney(String(inv.total))}
                </span>
              </div>
              <table
                className="w-full text-sm"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                <thead>
                  <tr className="bg-slate-100 text-xs text-slate-600">
                    <th className="py-2 px-3 text-start">{t('inventory.code')}</th>
                    <th className="py-2 px-3 text-start">{t('inventory.product')}</th>
                    <th className="py-2 px-3 text-center">{t('pos.posReview.sizeColor')}</th>
                    <th className="py-2 px-3 text-end">{t('inventory.quantity')}</th>
                    <th className="py-2 px-3 text-end">{t('pos.posReview.unitPrice')}</th>
                    <th className="py-2 px-3 text-end">{t('accounting.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((r, i) => (
                    <tr key={`${inv.sale_id}-${i}`} className="border-t hover:bg-blue-50/30">
                      <td className="py-2 px-3 font-mono text-xs font-bold text-blue-800">{r.product_code}</td>
                      <td className="py-2 px-3 font-semibold">{r.product_name}</td>
                      <td className="py-2 px-3 text-center text-xs text-slate-600">
                        {r.size_name} / {r.color_name}
                      </td>
                      <td className="py-2 px-3 text-end tabular-nums font-bold">{r.quantity}</td>
                      <td className="py-2 px-3 text-end tabular-nums">{fmtMoney(r.unit_price)}</td>
                      <td className="py-2 px-3 text-end tabular-nums font-black">{fmtMoney(r.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </PosSideCanvas>
  );
}

function CustomerProfileCanvas({
  customer,
  groups,
  types,
  canEdit,
  onClose,
  onSaved,
  onError,
}: {
  customer: CustomerDto;
  groups: CustomerGroupDto[];
  types: CustomerTypeDto[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const { t } = useLanguage();
  const [detail, setDetail] = useState<CustomerDto | null>(null);
  const [selectedType, setSelectedType] = useState<CustomerTypeDto | null>(null);
  const [form, setForm] = useState<{
    profile: Record<string, string | number | boolean>;
    workflow_status: string;
    customer_group: string;
    notes: string;
    collection_tier: CollectionTier;
  }>({ profile: {}, workflow_status: 'draft', customer_group: '', notes: '', collection_tier: 'auto' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    customersApi.get(customer.id).then((d) => {
      setDetail(d);
      setSelectedType(types.find((x) => x.id === d.customer_type) ?? null);
      setForm({
        workflow_status: d.workflow_status,
        customer_group: d.customer_group,
        notes: d.notes,
        collection_tier: (String(d.profile_data?.collection_tier || 'auto') as CollectionTier) || 'auto',
        profile: { ...(d.profile_data || {}) },
      });
    });
  }, [customer.id, types]);

  const save = async () => {
    if (!detail || !selectedType) return;
    setSaving(true);
    try {
      const profile = { ...form.profile, collection_tier: form.collection_tier };
      if (selectedType.slug === 'shop') profile.shop_name = String(profile.shop_name || '');
      await customersApi.update(detail.id, {
        customer_type: selectedType.id,
        customer_group: form.customer_group,
        workflow_status: form.workflow_status,
        notes: form.notes,
        profile_data: profile,
        name_ar: String(form.profile.name_ar || detail.name_ar),
        phone: String(form.profile.phone || detail.phone || ''),
        whatsapp: String(form.profile.whatsapp || detail.whatsapp || ''),
      });
      onSaved();
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PosSideCanvas
      open
      title={`${t('pos.posReview.viewProfile')} — ${customer.name_ar}`}
      onClose={onClose}
      wide
      footer={
        canEdit ? (
          <Button onClick={save} disabled={saving || !detail}>
            <Save className="h-4 w-4 me-1" />
            {t('inventory.save')}
          </Button>
        ) : (
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        )
      }
    >
      {detail ? (
        <fieldset disabled={!canEdit} className="space-y-4 border-0 p-0 m-0 min-w-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-[10px] text-slate-500">{t('inventory.code')}</p>
              <p className="font-mono font-black text-blue-800">{detail.code}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-[10px] text-slate-500">{t('customers.type')}</p>
              <p className="font-bold text-sm">{detail.customer_type_name}</p>
            </div>
            <div className="rounded-lg border bg-emerald-50 p-3">
              <p className="text-[10px] text-slate-500">{t('pos.posReview.totalSales')}</p>
              <p className="font-black text-emerald-800">{fmtMoney(detail.total_sales)}</p>
            </div>
            <div className="rounded-lg border bg-red-50 p-3">
              <p className="text-[10px] text-slate-500">{t('pos.posReview.balanceDue')}</p>
              <p className="font-black text-red-800">{fmtMoney(detail.balance_due)}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 rounded-xl border bg-slate-50 p-3">
            <div>
              <label className="text-xs font-bold text-slate-600">{t('customers.type')}</label>
              <select className={`${crmSelectClass()} mt-1`} value={selectedType?.id ?? ''} disabled>
                {types.map((ty) => (
                  <option key={ty.id} value={ty.id}>
                    {ty.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">{t('customers.group')} *</label>
              <select
                className={`${crmSelectClass()} mt-1`}
                value={form.customer_group}
                onChange={(e) => setForm((f) => ({ ...f, customer_group: e.target.value }))}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.path_label || g.name_ar}
                  </option>
                ))}
              </select>
            </div>
            {selectedType ? (
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-600">{t('inventory.status')}</label>
                <select
                  className={`${crmSelectClass()} mt-1`}
                  value={form.workflow_status}
                  onChange={(e) => setForm((f) => ({ ...f, workflow_status: e.target.value }))}
                >
                  {selectedType.workflow_steps.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label_ar}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="text-xs font-bold">{t('pos.posReview.collectionTier')}</label>
              <select
                className={`${ERP_NATIVE_SELECT} mt-1`}
                value={form.collection_tier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, collection_tier: e.target.value as CollectionTier }))
                }
              >
                <option value="auto">{t('pos.posReview.tierAuto')}</option>
                <option value="normal">{COLLECTION_TIER_PRESETS.normal.labelAr}</option>
                <option value="excellent">{COLLECTION_TIER_PRESETS.excellent.labelAr}</option>
                <option value="black">{COLLECTION_TIER_PRESETS.black.labelAr}</option>
                <option value="lawyer">{COLLECTION_TIER_PRESETS.lawyer.labelAr}</option>
              </select>
            </div>
            <div className="flex items-end">
              <StatusBadge
                status={detail.workflow_status === 'active' ? 'posted' : 'draft'}
                label={
                  detail.workflow_steps.find((s) => s.key === detail.workflow_status)?.label_ar ??
                  detail.workflow_status
                }
              />
            </div>
          </div>

          <CustomerSmartActions
            code={detail.code}
            phone={String(form.profile.phone || form.profile.owner_phone || detail.phone || '')}
            whatsapp={String(form.profile.whatsapp || detail.whatsapp || '')}
            gpsLat={String(form.profile.gps_lat || detail.gps_lat || '')}
            gpsLng={String(form.profile.gps_lng || detail.gps_lng || '')}
          />

          <SmartCustomerForm
            slug={detail.customer_type_slug}
            state={form}
            customerCode={detail.code}
            excludeId={detail.id}
            readOnlyStats={{
              last_activity_at: detail.last_activity_at,
              purchase_count: detail.purchase_count,
              avg_purchase_amount: detail.avg_purchase_amount,
              credit_score: detail.credit_score,
            }}
            onProfileChange={(key, val) => setForm((f) => ({ ...f, profile: { ...f.profile, [key]: val } }))}
          />

          <div>
            <label className="text-xs font-bold">{t('inventory.notes')}</label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-lg border px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t('pos.posReview.notesPlaceholder')}
            />
          </div>

          {detail.activities?.length ? (
            <div className="rounded-2xl border bg-slate-50 p-4">
              <h4 className="text-sm font-bold mb-2">{t('customers.activityLog')}</h4>
              <ul className="space-y-2 text-xs text-slate-600 max-h-40 overflow-y-auto">
                {detail.activities.map((a) => (
                  <li key={a.id} className="border-b border-slate-200 pb-1">
                    <span className="font-mono text-slate-400">
                      {a.created_at.slice(0, 16).replace('T', ' ')}
                    </span>
                    {' — '}
                    {a.summary}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </fieldset>
      ) : (
        <p>{t('inventory.loading')}</p>
      )}
    </PosSideCanvas>
  );
}

function StatementCanvas({ customer, onClose }: { customer: CustomerDto; onClose: () => void }) {
  const { t } = useLanguage();

  return (
    <PosSideCanvas open title={`${t('pos.posReview.viewStatement')} — ${customer.name_ar}`} onClose={onClose} wide>
      <CustomerAccountStatementReport
        customerId={customer.id}
        customerName={customer.name_ar}
        embedded
        autoLoad
      />
    </PosSideCanvas>
  );
}

function CollectCanvas({
  customer,
  canDiscount,
  onClose,
  onMessage,
  onError,
}: {
  customer: CustomerDto;
  canDiscount: boolean;
  onClose: () => void;
  onMessage: (m: string) => void;
  onError: (m: string) => void;
}) {
  const { t } = useLanguage();
  const [remainingOnly, setRemainingOnly] = useState(true);
  const [lines, setLines] = useState<InstallmentCollectionLine[]>([]);
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ov = await receivablesApi.installmentCollection(customer.id, !remainingOnly);
      setLines(ov.lines);
      setAmount(ov.total_balance);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [customer.id, remainingOnly, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    let due = 0;
    let penalty = 0;
    let paid = 0;
    let balance = 0;
    let lateCount = 0;
    let onTimeCount = 0;
    for (const ln of lines) {
      due += parseFloat(ln.amount_due) || 0;
      penalty += parseFloat(ln.penalty_amount) || 0;
      paid += parseFloat(ln.amount_paid) || 0;
      balance += parseFloat(ln.balance) || 0;
      if (ln.paid_at) {
        if (isPaidLate(ln.due_date, ln.paid_at)) lateCount += 1;
        else if (isPaidOnTime(ln.due_date, ln.paid_at)) onTimeCount += 1;
      }
    }
    return {
      due,
      penalty,
      paid,
      balance,
      count: lines.length,
      lateCount,
      onTimeCount,
      grand: due + penalty,
    };
  }, [lines]);

  const submit = async () => {
    const gross = parseFloat(amount) || 0;
    const disc = parseFloat(discount) || 0;
    const net = Math.max(gross - disc, 0);
    if (net <= 0) return;
    setSaving(true);
    try {
      const res = await receivablesApi.collectInstallmentPayment({
        customer: customer.id,
        amount: String(net),
        method: 'cash',
        reference: disc > 0 ? `discount:${disc}` : '',
      });
      const ov = await receivablesApi.installmentCollection(customer.id, !remainingOnly);
      setLines(ov.lines);
      setAmount(ov.total_balance);
      onMessage(`${t('pos.posReview.collected')} ${res.code}`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const rowClass = (ln: InstallmentCollectionLine) => {
    if (ln.status === 'paid' || parseFloat(ln.balance) === 0) {
      if (isPaidLate(ln.due_date, ln.paid_at)) return 'bg-red-50/90';
      if (isPaidOnTime(ln.due_date, ln.paid_at)) return 'bg-emerald-50/80';
      return 'bg-slate-50/60';
    }
    if (parseFloat(ln.penalty_amount) > 0 || (ln.days_overdue ?? 0) > 0) return 'bg-amber-50/80';
    return '';
  };

  return (
    <PosSideCanvas
      open
      title={t('pos.posReview.collectScreenTitle')}
      onClose={onClose}
      extraWide
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !amount || parseFloat(amount) <= 0}
            className="bg-emerald-700 hover:bg-emerald-800 min-w-[140px]"
          >
            <Banknote className="h-4 w-4 me-1" />
            {t('pos.posReview.saveCollect')}
          </Button>
        </div>
      }
    >
      <style>{`
        .pos-collect-th {
          background: linear-gradient(180deg, #1e40af 0%, #1d4ed8 100%);
          color: #fff;
          font-weight: 800;
          border: 1px solid #1e3a8a;
          padding: 8px 10px;
          text-align: center;
          font-size: 11px;
          white-space: nowrap;
        }
        .pos-collect-td {
          border: 1px solid #cbd5e1;
          padding: 7px 8px;
          text-align: center;
          font-size: 12px;
          vertical-align: middle;
        }
        .pos-collect-totals td {
          background: #ffedd5;
          font-weight: 800;
          border: 1px solid #fdba74;
        }
      `}</style>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-end">
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-3">
          <label className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
            {t('pos.posReview.customerName')}
          </label>
          <p className="mt-1 text-lg font-black text-slate-900">{customer.name_ar}</p>
          <p className="text-xs font-mono text-slate-500">{customer.code}</p>
        </div>
        <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-3">
          <label className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            {t('pos.posReview.collectedAmount')}
          </label>
          <Input
            className="mt-1 h-12 text-xl font-black border-emerald-300 focus:border-emerald-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>
        {canDiscount ? (
          <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-b from-violet-50 to-white p-3">
            <label className="text-[10px] font-bold uppercase tracking-wide text-violet-800">
              {t('pos.posReview.installmentDiscount')}
            </label>
            <Input
              className="mt-1 h-12 text-lg font-bold border-violet-300"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              inputMode="decimal"
            />
          </div>
        ) : (
          <div className="hidden md:block" />
        )}
        <label className="flex items-center gap-2.5 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors min-h-[76px]">
          <input
            type="checkbox"
            checked={remainingOnly}
            onChange={(e) => setRemainingOnly(e.target.checked)}
            className="h-5 w-5 accent-blue-700 shrink-0"
          />
          <span className="leading-snug">{t('pos.posReview.remainingOnly')}</span>
        </label>
      </div>

      {!remainingOnly && lines.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {totals.onTimeCount > 0 ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800">
              {t('pos.posReview.paidOnTime')}: {totals.onTimeCount}
            </span>
          ) : null}
          {totals.lateCount > 0 ? (
            <span className="rounded-full bg-red-100 px-3 py-1 font-bold text-red-800">
              {t('pos.posReview.paidLate')}: {totals.lateCount}
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            {t('pos.posReview.compareDatesHint')}
          </span>
        </div>
      ) : null}

      {loading ? (
        <p className="py-10 text-center text-slate-500">{t('inventory.loading')}</p>
      ) : lines.length === 0 ? (
        <p className="py-10 text-center text-slate-500">{t('pos.posReview.noContracts')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm">
          <table
            className="w-full border-collapse min-w-[920px]"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            <thead>
              <tr>
                <th className="pos-collect-th">{t('pos.posReview.dueDate')}</th>
                <th className="pos-collect-th">{t('pos.posReview.installmentValue')}</th>
                <th className="pos-collect-th">{t('pos.posReview.lateFee')}</th>
                <th className="pos-collect-th">{t('pos.posReview.installmentTotal')}</th>
                <th className="pos-collect-th">{t('pos.posReview.paid')}</th>
                <th className="pos-collect-th">{t('pos.posReview.remaining')}</th>
                <th className="pos-collect-th">{t('inventory.notes')}</th>
                <th className="pos-collect-th">{t('pos.posReview.paymentDate')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln) => {
                const late = isPaidLate(ln.due_date, ln.paid_at);
                const onTime = isPaidOnTime(ln.due_date, ln.paid_at);
                const lineTotal =
                  ln.total_amount ||
                  String((parseFloat(ln.amount_due) || 0) + (parseFloat(ln.penalty_amount) || 0));
                const unpaid = parseFloat(ln.balance) > 0;
                return (
                  <tr key={ln.id} className={`hover:brightness-[0.98] ${rowClass(ln)}`}>
                    <td className="pos-collect-td font-bold text-slate-800">{fmtMonth(ln.due_date)}</td>
                    <td className="pos-collect-td tabular-nums">{fmtMoney(ln.amount_due)}</td>
                    <td className="pos-collect-td tabular-nums text-red-700 font-semibold">
                      {parseFloat(ln.penalty_amount) > 0 ? fmtMoney(ln.penalty_amount) : '—'}
                    </td>
                    <td className="pos-collect-td tabular-nums font-black">{fmtMoney(lineTotal)}</td>
                    <td className="pos-collect-td tabular-nums font-semibold">
                      {parseFloat(ln.amount_paid) > 0 ? fmtMoney(ln.amount_paid) : '—'}
                    </td>
                    <td className={`pos-collect-td tabular-nums font-black ${unpaid ? 'text-red-700' : 'text-emerald-700'}`}>
                      {parseFloat(ln.balance) > 0 ? fmtMoney(ln.balance) : '—'}
                    </td>
                    <td className="pos-collect-td text-[11px] text-start max-w-[120px] truncate" title={ln.notes || ''}>
                      {ln.notes || '—'}
                    </td>
                    <td
                      className={`pos-collect-td font-bold ${
                        late ? 'text-red-700 bg-red-100/50' : onTime ? 'text-emerald-700' : ''
                      }`}
                      title={
                        late
                          ? `${t('pos.posReview.paidLate')} — ${fmtMonth(ln.due_date)} → ${fmtPaidMonth(ln.paid_at)}`
                          : onTime
                            ? t('pos.posReview.paidOnTime')
                            : undefined
                      }
                    >
                      {ln.paid_at ? fmtPaidMonth(ln.paid_at) : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr className="pos-collect-totals">
                <td className="pos-collect-td text-start font-black">{t('pos.posReview.totals')}</td>
                <td className="pos-collect-td tabular-nums">{fmtMoney(String(totals.due))}</td>
                <td className="pos-collect-td tabular-nums text-red-700">{fmtMoney(String(totals.penalty))}</td>
                <td className="pos-collect-td tabular-nums">{fmtMoney(String(totals.grand))}</td>
                <td className="pos-collect-td tabular-nums">{fmtMoney(String(totals.paid))}</td>
                <td className="pos-collect-td tabular-nums text-red-800">{fmtMoney(String(totals.balance))}</td>
                <td className="pos-collect-td" colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 max-w-lg ms-auto">
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-center shadow-sm">
          <p className="text-[11px] font-bold text-blue-800">{t('pos.posReview.totalInstallments')}</p>
          <p className="mt-1 text-3xl font-black text-blue-900 tabular-nums">{totals.count}</p>
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center shadow-sm">
          <p className="text-[11px] font-bold text-red-800">{t('pos.posReview.totalRemaining')}</p>
          <p className="mt-1 text-3xl font-black text-red-800 tabular-nums">{fmtMoney(String(totals.balance))}</p>
        </div>
      </div>
    </PosSideCanvas>
  );
}

function addOneMonth(iso: string) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

type RestructureRow = {
  key: string;
  id?: string;
  due_date: string;
  balance: string;
  amount_paid: string;
  penalty_amount: string;
  isNew?: boolean;
};

function buildRestructureRows(contract: InstallmentContract): RestructureRow[] {
  return (contract.lines || [])
    .filter((ln) => ln.status !== 'paid' && ln.status !== 'cancelled')
    .map((ln) => ({
      key: ln.id,
      id: ln.id,
      due_date: ln.due_date,
      balance: ln.balance,
      amount_paid: ln.amount_paid,
      penalty_amount: ln.penalty_amount,
    }));
}

function RestructureCanvas({
  customer,
  onClose,
  onMessage,
  onError,
}: {
  customer: CustomerDto;
  onClose: () => void;
  onMessage: (m: string) => void;
  onError: (m: string) => void;
}) {
  const { t } = useLanguage();
  const [contracts, setContracts] = useState<InstallmentContract[]>([]);
  const [detail, setDetail] = useState<InstallmentContract | null>(null);
  const [rows, setRows] = useState<RestructureRow[]>([]);
  const [lockedTotal, setLockedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyDetail = (full: InstallmentContract) => {
    setDetail(full);
    const editable = buildRestructureRows(full);
    setRows(editable);
    setLockedTotal(editable.reduce((s, r) => s + (parseFloat(r.balance) || 0), 0));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await receivablesApi.installmentContracts(customer.id);
      setContracts(list);
      if (list[0]) {
        const full = await receivablesApi.installmentContract(list[0].id);
        applyDetail(full);
      } else {
        setDetail(null);
        setRows([]);
        setLockedTotal(0);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [customer.id, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const currentTotal = useMemo(
    () => rows.reduce((s, r) => s + (parseFloat(r.balance) || 0), 0),
    [rows],
  );

  const totalsMatch = Math.abs(currentTotal - lockedTotal) < 0.01;

  const mismatchDiff = currentTotal - lockedTotal;

  const mismatchAdvice = useMemo(() => {
    if (totalsMatch) return null;
    const abs = Math.abs(mismatchDiff);
    const amount = fmtMoney(abs.toFixed(2));
    if (mismatchDiff > 0) {
      return {
        message: t('pos.posReview.restructureOver', { amount }),
        suggestion: t('pos.posReview.restructureSuggestReduce', { amount }),
      };
    }
    return {
      message: t('pos.posReview.restructureUnder', { amount }),
      suggestion: t('pos.posReview.restructureSuggestAdd', { amount }),
    };
  }, [totalsMatch, mismatchDiff, t]);

  const updateRowBalance = (key: string, balance: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, balance } : r)));
  };

  const updateRowDate = (key: string, due_date: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, due_date } : r)));
  };

  const applySuggestedFix = () => {
    const diff = lockedTotal - currentTotal;
    if (Math.abs(diff) < 0.01 || rows.length === 0) return;
    const last = rows[rows.length - 1];
    const cur = parseFloat(last.balance) || 0;
    setRows((prev) =>
      prev.map((r) =>
        r.key === last.key ? { ...r, balance: String(Math.max(0, cur + diff)) } : r,
      ),
    );
  };

  const distributeEvenly = () => {
    if (rows.length === 0 || lockedTotal <= 0) return;
    const each = lockedTotal / rows.length;
    let allocated = 0;
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx === prev.length - 1) {
          return { ...r, balance: (lockedTotal - allocated).toFixed(2) };
        }
        const val = parseFloat(each.toFixed(2));
        allocated += val;
        return { ...r, balance: each.toFixed(2) };
      }),
    );
  };

  const addMonth = () => {
    const lastDate = rows.length ? rows[rows.length - 1].due_date : new Date().toISOString().slice(0, 10);
    setRows((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        due_date: addOneMonth(lastDate),
        balance: '0',
        amount_paid: '0',
        penalty_amount: '0',
        isNew: true,
      },
    ]);
  };

  const removeRow = (key: string) => {
    if (rows.length <= 1) {
      onError(t('pos.posReview.restructureMinOneRow'));
      return;
    }
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const selectContract = async (id: string) => {
    try {
      const full = await receivablesApi.installmentContract(id);
      applyDetail(full);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    }
  };

  const save = async () => {
    if (!detail) return;
    if (!totalsMatch) {
      const msg = mismatchAdvice
        ? `${mismatchAdvice.message} — ${mismatchAdvice.suggestion}`
        : t('pos.posReview.restructureMismatch');
      onError(msg);
      return;
    }
    setSaving(true);
    try {
      const updated = await receivablesApi.restructureContract(detail.id, {
        expected_total: lockedTotal.toFixed(2),
        lines: rows.map((r) => ({
          id: r.id,
          due_date: r.due_date,
          balance: (parseFloat(r.balance) || 0).toFixed(2),
        })),
      });
      applyDetail(updated);
      onMessage(t('pos.posReview.restructureSaved'));
    } catch (e) {
      onError(e instanceof Error ? e.message : t('pos.posReview.restructureMismatch'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PosSideCanvas
      open
      title={`${t('pos.posReview.restructureScreenTitle')} — ${customer.name_ar}`}
      onClose={onClose}
      extraWide
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={save}
            disabled={saving || rows.length === 0}
            className={`min-w-[160px] ${totalsMatch ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            <Save className="h-4 w-4 me-1" />
            {t('pos.posReview.restructureSave')}
          </Button>
        </div>
      }
    >
      <style>{`
        .pos-restruct-th {
          background: linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%);
          color: #fff;
          font-weight: 800;
          border: 1px solid #5b21b6;
          padding: 8px 10px;
          text-align: center;
          font-size: 11px;
          white-space: nowrap;
        }
        .pos-restruct-td {
          border: 1px solid #cbd5e1;
          padding: 7px 8px;
          text-align: center;
          font-size: 12px;
          vertical-align: middle;
        }
      `}</style>

      {loading ? (
        <p className="py-10 text-center text-slate-500">{t('inventory.loading')}</p>
      ) : contracts.length === 0 ? (
        <p className="text-slate-500 py-8 text-center">{t('pos.posReview.noContracts')}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
            <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-b from-violet-50 to-white p-3">
              <label className="text-[10px] font-bold uppercase tracking-wide text-violet-800">
                {t('pos.posReview.customerName')}
              </label>
              <p className="mt-1 text-lg font-black">{customer.name_ar}</p>
              <select
                className={`${ERP_NATIVE_SELECT} mt-2`}
                value={detail?.id || ''}
                onChange={(e) => selectContract(e.target.value)}
              >
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {fmtMoney(c.totals?.balance_due || '0')}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="outline" onClick={addMonth} className="h-11 border-violet-300">
              <Plus className="h-4 w-4 me-1" />
              {t('pos.posReview.restructureAddMonth')}
            </Button>
          </div>

          <p className="rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-xs font-medium text-violet-900">
            {t('pos.posReview.restructureManualHint')}
          </p>

          {!totalsMatch && mismatchAdvice ? (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 space-y-2">
              <p className="text-sm font-bold text-red-800">{mismatchAdvice.message}</p>
              <p className="text-xs text-red-700">{mismatchAdvice.suggestion}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={applySuggestedFix}>
                  {t('pos.posReview.restructureApplyToLast')}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={distributeEvenly}>
                  {t('pos.posReview.restructureDistributeEven')}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm">
            <table
              className="w-full border-collapse min-w-[720px]"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              <thead>
                <tr>
                  <th className="pos-restruct-th w-12">#</th>
                  <th className="pos-restruct-th">{t('pos.posReview.dueDate')}</th>
                  <th className="pos-restruct-th">{t('pos.posReview.restructurePaid')}</th>
                  <th className="pos-restruct-th">{t('pos.posReview.restructureBalance')}</th>
                  <th className="pos-restruct-th w-14" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.key}
                    className={`hover:bg-violet-50/40 ${row.isNew ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="pos-restruct-td font-bold text-slate-600">{idx + 1}</td>
                    <td className="pos-restruct-td">
                      <Input
                        type="date"
                        className="h-9 min-w-[140px]"
                        value={row.due_date}
                        onChange={(e) => updateRowDate(row.key, e.target.value)}
                      />
                    </td>
                    <td className="pos-restruct-td tabular-nums text-slate-600">
                      {parseFloat(row.amount_paid) > 0 ? fmtMoney(row.amount_paid) : '—'}
                    </td>
                    <td className="pos-restruct-td">
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-9 text-end font-black min-w-[100px]"
                        value={row.balance}
                        onChange={(e) => updateRowBalance(row.key, e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="pos-restruct-td">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeRow(row.key)}
                        title={t('pos.posReview.restructureRemoveRow')}
                        disabled={rows.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2 max-w-2xl ms-auto border-t border-slate-200 pt-4">
            <div className="rounded-xl border-2 border-slate-300 bg-slate-100 p-4">
              <label className="text-[11px] font-bold text-slate-600 block mb-2">
                {t('pos.posReview.restructureLockedTotal')}
              </label>
              <p className="text-3xl font-black tabular-nums text-slate-800">
                {fmtMoney(lockedTotal.toFixed(2))}
              </p>
            </div>
            <div
              className={`rounded-xl border-2 p-4 ${
                totalsMatch ? 'border-emerald-300 bg-emerald-50' : 'border-red-400 bg-red-50'
              }`}
            >
              <label
                className={`text-[11px] font-bold block mb-2 ${
                  totalsMatch ? 'text-emerald-800' : 'text-red-800'
                }`}
              >
                {t('pos.posReview.restructureCurrentTotal')}
              </label>
              <p
                className={`text-3xl font-black tabular-nums ${
                  totalsMatch ? 'text-emerald-800' : 'text-red-700'
                }`}
              >
                {fmtMoney(currentTotal.toFixed(2))}
              </p>
              {!totalsMatch && mismatchAdvice ? (
                <p className="text-xs text-red-700 mt-2 font-bold leading-snug">
                  {mismatchAdvice.suggestion}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </PosSideCanvas>
  );
}

export { GROUP_COLOR_PRESETS } from '@/lib/customers/collectionTier';
