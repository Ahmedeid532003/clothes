import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Layers,
  RefreshCw,
  Save,
  Search,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  customersApi,
  fetchCustomerMeta,
  fetchCustomerAccountStatement,
  type CustomerGroupDto,
  type CustomerPurchaseItem,
  type CustomerStatementRow,
} from '@/lib/api/customers';
import { fetchPosCustomerReview, type PosCustomerReviewRow } from '@/lib/api/pos';
import {
  receivablesApi,
  type InstallmentCollectionLine,
} from '@/lib/api/receivables';
import {
  COLLECTION_TIER_PRESETS,
  contrastText,
} from '@/lib/customers/collectionTier';
import { canPerformAction } from '@/lib/permissions/access';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import { fmtPosAmount } from '../pos-utils';
import {
  PosInstallmentCalculator,
  type InstallmentCalcState,
} from './PosInstallmentCalculator';

type Canvas = 'items' | 'profile' | 'statement' | 'collect' | 'restructure' | 'quickEdit';

type Props = {
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
};

function fmtSaleDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function groupPurchaseItems(rows: CustomerPurchaseItem[]) {
  const map = new Map<string, CustomerPurchaseItem[]>();
  for (const row of rows) {
    const list = map.get(row.sale_id) || [];
    list.push(row);
    map.set(row.sale_id, list);
  }
  return Array.from(map.entries()).map(([saleId, items]) => ({
    saleId,
    saleCode: items[0]?.sale_code || saleId,
    items,
  }));
}

export function PosAccountsTab({ onMessage, onError }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<PosCustomerReviewRow[]>([]);
  const [groups, setGroups] = useState<CustomerGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [calc, setCalc] = useState<InstallmentCalcState>({
    invoiceTotal: 5000,
    downPayment: 1000,
    months: 6,
    interestRate: 1,
  });
  const [approving, setApproving] = useState(false);

  const canCollect = canPerformAction(user, 'installment-collection', 'update');
  const canRestructure = canPerformAction(user, 'customer-installments', 'update');
  const canEditCustomer = canPerformAction(user, 'customers', 'update');

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? null,
    [customers, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, meta] = await Promise.all([
        fetchPosCustomerReview(search),
        fetchCustomerMeta(),
      ]);
      setCustomers(rows);
      setGroups(meta.groups);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [search, onError]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const actions: Array<{ id: Canvas; label: string; disabled?: boolean }> = [
    { id: 'items', label: t('pos.posReview.viewItems') },
    { id: 'profile', label: t('pos.posReview.viewProfile') },
    { id: 'statement', label: t('pos.posReview.viewStatement') },
    { id: 'collect', label: t('pos.posReview.collectInstallments'), disabled: !canCollect },
    { id: 'restructure', label: t('pos.posReview.restructure'), disabled: !canRestructure },
    { id: 'quickEdit', label: t('pos.posReview.editNotesTier'), disabled: !canEditCustomer },
  ];

  const tierBadge = (c: PosCustomerReviewRow) => {
    const preset = COLLECTION_TIER_PRESETS[c.tier];
    const bg = c.customer_group_color || c.tier_color || preset?.bg || '';
    const hasBg = !!bg;
    return (
      <span
        className={`psc-acc-tier ${hasBg ? '' : 'psc-acc-tier--plain'}`}
        style={hasBg ? { backgroundColor: bg, color: contrastText(bg) } : undefined}
      >
        {c.customer_group_name || c.tier_label}
      </span>
    );
  };

  const approvePlan = async () => {
    if (!selected) {
      onError(t('pos.smart.accounts.selectCustomerFirst'));
      return;
    }
    setApproving(true);
    try {
      const plans = await receivablesApi.installmentPlans(true);
      const plan = plans[0];
      await receivablesApi.createContract({
        customer: selected.id,
        plan: plan?.id,
        principal_amount: String(calc.invoiceTotal),
        num_installments: calc.months,
        down_payment_amount: String(calc.downPayment),
      });
      onMessage(t('pos.smart.accounts.planApproved'));
      void load();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="psc-accounts">
      <div className="psc-acc-layout">
        <main className="psc-acc-workspace">
          <div className="psc-acc-search-row">
            <button type="button" className="psc-acc-refresh" onClick={() => void load()} title={t('customers.refresh')}>
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="psc-acc-search">
              <Search className="h-5 w-5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('pos.posReview.searchPlaceholder')}
              />
            </div>
          </div>

          <div className="psc-acc-actions">
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`psc-acc-action-btn ${canvas === a.id ? 'psc-acc-action-btn--active' : ''}`}
                disabled={!selected || a.disabled}
                onClick={() => setCanvas(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>

          {selected && canvas ? (
            <AccountsDetailPanel
              canvas={canvas}
              customer={selected}
              groups={groups}
              onClose={() => setCanvas(null)}
              onMessage={onMessage}
              onError={onError}
              onSaved={() => {
                void load();
                onMessage(t('pos.posReview.profileSaved'));
              }}
            />
          ) : null}

          <div className="psc-acc-table-wrap">
            <table className="psc-acc-table">
              <thead>
                <tr>
                  <th className="psc-acc-th-num">#</th>
                  <th className="psc-acc-th-select" />
                  <th>{t('inventory.code')}</th>
                  <th>{t('pos.posReview.customerName')}</th>
                  <th>{t('pos.posReview.balance')}</th>
                  <th>{t('inventory.notes')}</th>
                  <th>{t('pos.posReview.customerGroup')}</th>
                  <th>{t('pos.posReview.spouse')}</th>
                  <th>{t('pos.posReview.guarantor')}</th>
                  <th>{t('pos.posReview.phone')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="psc-acc-empty-cell">
                      {t('inventory.loading')}
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="psc-acc-empty-cell">
                      {t('inventory.empty')}
                    </td>
                  </tr>
                ) : (
                  customers.map((c, rowIdx) => {
                    const active = c.id === selectedId;
                    const bal = parseFloat(c.balance_due) || 0;
                    return (
                      <tr
                        key={c.id}
                        className={active ? 'psc-acc-row--active' : ''}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <td className="psc-acc-num">{rowIdx + 1}</td>
                        <td className="psc-acc-radio-cell">
                          <input
                            type="radio"
                            name="psc-acc-customer"
                            checked={active}
                            onChange={() => setSelectedId(c.id)}
                            className="psc-acc-radio"
                          />
                        </td>
                        <td className="psc-acc-code">{c.code}</td>
                        <td className="psc-acc-name">{c.name_ar}</td>
                        <td className={`psc-acc-balance ${bal > 0 ? 'psc-acc-balance--debt' : ''}`}>
                          {fmtMoney(c.balance_due)}
                        </td>
                        <td className="psc-acc-notes" title={c.notes || ''}>
                          {c.notes || '—'}
                        </td>
                        <td className="psc-acc-tier-cell">{tierBadge(c)}</td>
                        <td className="psc-acc-cell">{c.spouse_name || '—'}</td>
                        <td className="psc-acc-notes" title={c.guarantor_summary || c.guarantor_name || ''}>
                          {c.guarantor_summary || c.guarantor_name || '—'}
                        </td>
                        <td className="psc-acc-phone">{c.phone || c.whatsapp || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>

        <div className="psc-acc-side-wrap">
          <PosInstallmentCalculator
          value={calc}
          onChange={(patch) => setCalc((c) => ({ ...c, ...patch }))}
          customerName={selected?.name_ar}
          onApprove={() => void approvePlan()}
          approving={approving}
          />
        </div>
      </div>

      <button type="button" className="psc-buyer-btn" onClick={() => onMessage(t('pos.smart.buyerScreen'))}>
        <Smartphone className="h-3 w-3" />
        {t('pos.smart.buyerScreen')}
      </button>
    </div>
  );
}

function AccountsDetailPanel({
  canvas,
  customer,
  groups,
  onClose,
  onMessage,
  onError,
  onSaved,
}: {
  canvas: Canvas;
  customer: PosCustomerReviewRow;
  groups: CustomerGroupDto[];
  onClose: () => void;
  onMessage: (m: string) => void;
  onError: (m: string) => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const titles: Record<Canvas, string> = {
    items: t('pos.smart.accounts.itemsTitle', { name: customer.name_ar }),
    profile: t('pos.smart.accounts.profileTitle', { name: customer.name_ar }),
    statement: t('pos.smart.accounts.statementTitle', { name: customer.name_ar }),
    collect: t('pos.smart.accounts.collectTitle', { name: customer.name_ar }),
    restructure: t('pos.smart.accounts.restructureTitle', { name: customer.name_ar }),
    quickEdit: t('pos.smart.accounts.editClientFile', { name: customer.name_ar }),
  };

  return (
    <div className={`psc-acc-detail ${canvas === 'quickEdit' ? 'psc-acc-detail--edit' : ''}`}>
      <header className="psc-acc-detail-head">
        <button type="button" className="psc-acc-detail-close" onClick={onClose} aria-label={t('common.cancel')}>
          <X className="h-5 w-5" />
        </button>
        <h3>
          <User className="h-5 w-5 text-blue-600" />
          {titles[canvas]}
        </h3>
      </header>
      <div className="psc-acc-detail-body">
        {canvas === 'items' ? (
          <ItemsPanel customerId={customer.id} />
        ) : canvas === 'profile' ? (
          <ProfilePanel customer={customer} />
        ) : canvas === 'statement' ? (
          <StatementPanel customerId={customer.id} customerName={customer.name_ar} balance={customer.balance_due} />
        ) : canvas === 'collect' ? (
          <CollectPanel customerId={customer.id} onMessage={onMessage} onError={onError} />
        ) : canvas === 'restructure' ? (
          <RestructurePanel customerId={customer.id} onMessage={onMessage} onError={onError} onSaved={onSaved} />
        ) : (
          <QuickEditPanel customer={customer} groups={groups} onSaved={onSaved} onError={onError} />
        )}
      </div>
    </div>
  );
}

function ItemsPanel({ customerId }: { customerId: string }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CustomerPurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customersApi.purchaseItems(customerId).then(setRows).finally(() => setLoading(false));
  }, [customerId]);

  const grouped = useMemo(() => groupPurchaseItems(rows), [rows]);
  const currency = t('dashboard.currency');

  if (loading) return <p className="psc-acc-panel-loading">{t('inventory.loading')}</p>;
  if (rows.length === 0) return <p className="psc-acc-panel-empty">{t('inventory.empty')}</p>;

  return (
    <div>
      <p className="psc-acc-panel-sub">{t('pos.smart.accounts.prevPurchases')}</p>
      <div className="psc-acc-product-grid">
        {grouped.flatMap((g) =>
          g.items.map((item, idx) => (
            <article key={`${g.saleId}-${idx}`} className="psc-acc-product-card">
              <div className="psc-acc-product-img">📱</div>
              <div className="psc-acc-product-info">
                <strong>{item.product_name}</strong>
                <span className="code">{item.product_code}</span>
                <span className="price">
                  {fmtPosAmount(parseFloat(item.line_total))} {currency}
                </span>
              </div>
            </article>
          )),
        )}
      </div>
    </div>
  );
}

function ProfilePanel({ customer }: { customer: PosCustomerReviewRow }) {
  const { t } = useLanguage();
  const currency = t('dashboard.currency');
  const bal = parseFloat(customer.balance_due) || 0;

  return (
    <div className="psc-acc-profile-grid">
      <section>
        <h4>{t('pos.smart.accounts.personalData')}</h4>
        <p>
          <span>{t('pos.posReview.customerName')}</span>
          <strong>{customer.name_ar}</strong>
        </p>
        <p>
          <span>{t('inventory.code')}</span>
          <strong>{customer.code}</strong>
        </p>
        <p>
          <span>{t('pos.posReview.phone')}</span>
          <strong>{customer.phone || customer.whatsapp || '—'}</strong>
        </p>
      </section>
      <section>
        <h4>{t('pos.smart.accounts.familyGuarantors')}</h4>
        <p>
          <span>{t('pos.posReview.spouse')}</span>
          <strong>{customer.spouse_name || '—'}</strong>
        </p>
        <p>
          <span>{t('pos.posReview.guarantor')}</span>
          <strong>{customer.guarantor_summary || customer.guarantor_name || '—'}</strong>
        </p>
        <p>
          <span>{t('pos.posReview.collectionTier')}</span>
          <strong>{customer.tier_label}</strong>
        </p>
      </section>
      <section>
        <h4>{t('pos.smart.accounts.statusCredit')}</h4>
        <p>
          <span>{t('pos.posReview.balanceDue')}</span>
          <strong className="psc-acc-debt-text">
            {fmtPosAmount(bal)} {currency}
          </strong>
        </p>
        <p>
          <span>{t('pos.smart.accounts.accountStatus')}</span>
          <strong className="psc-acc-status-text">{t('pos.smart.accounts.activeAuthorized')}</strong>
        </p>
        <p>
          <span>{t('inventory.notes')}</span>
          <strong>{customer.notes || '—'}</strong>
        </p>
      </section>
    </div>
  );
}

function StatementPanel({
  customerId,
  balance,
}: {
  customerId: string;
  customerName: string;
  balance: string;
}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CustomerStatementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCustomerAccountStatement({ customer: customerId, view: 'general' })
      .then((d) => setRows(d.rows))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  return (
    <div className="psc-acc-statement">
      {loading ? (
        <p className="psc-acc-panel-loading">{t('inventory.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="psc-acc-panel-empty">{t('pos.smart.accounts.noStatementRows')}</p>
      ) : (
        <table className="psc-acc-statement-table">
          <thead>
            <tr>
              <th>{t('pos.smart.accounts.stmtDesc')}</th>
              <th>{t('pos.smart.accounts.stmtDate')}</th>
              <th>{t('pos.smart.accounts.stmtValue')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.date}-${r.document_code}-${i}`}>
                <td>{r.transaction_label || r.document_code || '—'}</td>
                <td>{fmtSaleDate(r.date)}</td>
                <td className="psc-acc-stmt-val">
                  {fmtMoney(r.debit || r.credit || r.balance || '0')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <footer className="psc-acc-statement-foot">
        {t('pos.smart.accounts.currentDebt')}: <strong>{fmtMoney(balance)}</strong>
      </footer>
    </div>
  );
}

function CollectPanel({
  customerId,
  onMessage,
  onError,
}: {
  customerId: string;
  onMessage: (m: string) => void;
  onError: (m: string) => void;
}) {
  const { t } = useLanguage();
  const [lines, setLines] = useState<InstallmentCollectionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const currency = t('dashboard.currency');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ov = await receivablesApi.installmentCollection(customerId, false);
      setLines(ov.lines.filter((ln) => parseFloat(ln.balance) > 0));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [customerId, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const collectOne = async (ln: InstallmentCollectionLine) => {
    setCollectingId(ln.id);
    try {
      const res = await receivablesApi.collectInstallmentPayment({
        customer: customerId,
        amount: ln.balance,
        method: 'cash',
      });
      onMessage(`${t('pos.posReview.collected')} ${res.code}`);
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setCollectingId(null);
    }
  };

  if (loading) return <p className="psc-acc-panel-loading">{t('inventory.loading')}</p>;
  if (lines.length === 0) return <p className="psc-acc-panel-empty">{t('pos.posReview.noContracts')}</p>;

  return (
    <div className="psc-acc-collect-grid">
      {lines.map((ln, idx) => (
        <article key={ln.id} className="psc-acc-collect-card">
          <span className="psc-acc-collect-badge">
            {t('pos.smart.accounts.installmentN', { n: String(idx + 1), total: String(lines.length) })}
          </span>
          <div className="psc-acc-collect-body">
            <button
              type="button"
              className="psc-acc-collect-btn"
              disabled={collectingId === ln.id}
              onClick={() => void collectOne(ln)}
            >
              <Banknote className="h-4 w-4" />
              {t('pos.smart.accounts.collectNow')}
            </button>
            <div className="psc-acc-collect-meta">
              <span>
                {t('pos.posReview.dueDate')}: {fmtSaleDate(ln.due_date)}
              </span>
              <strong>
                {t('pos.posReview.installmentValue')}: {fmtPosAmount(parseFloat(ln.balance))} {currency}
              </strong>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function RestructurePanel({
  customerId,
  onMessage,
  onError,
  onSaved,
}: {
  customerId: string;
  onMessage: (m: string) => void;
  onError: (m: string) => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('1600');
  const [months, setMonths] = useState('2');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const contracts = await receivablesApi.installmentContracts(customerId);
      const contract = contracts[0];
      if (!contract) {
        onError(t('pos.posReview.noContracts'));
        return;
      }
      const full = await receivablesApi.installmentContract(contract.id);
      const unpaid = (full.lines || []).filter((ln) => ln.status !== 'paid' && ln.status !== 'cancelled');
      const n = Math.max(parseInt(months, 10) || 1, 1);
      const total = parseFloat(amount) || 0;
      const each = total / n;
      const baseDate = new Date();
      const lines = Array.from({ length: n }, (_, i) => {
        const existing = unpaid[i];
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i + 1);
        return {
          id: existing?.id,
          due_date: d.toISOString().slice(0, 10),
          balance: (i === n - 1 ? total - each * (n - 1) : each).toFixed(2),
        };
      });
      await receivablesApi.restructureContract(contract.id, {
        expected_total: total.toFixed(2),
        lines,
      });
      onMessage(t('pos.posReview.restructureSaved'));
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="psc-acc-restructure">
      <p className="psc-acc-panel-sub">{t('pos.smart.accounts.restructureHint')}</p>
      <div className="psc-acc-restructure-fields">
        <label>
          {t('pos.smart.accounts.newDebtAmount')}
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          {t('pos.smart.accounts.numMonths')}
          <input type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} />
        </label>
      </div>
      <button type="button" className="psc-acc-restructure-save" disabled={saving} onClick={() => void save()}>
        <Layers className="h-4 w-4" />
        {t('pos.smart.accounts.saveReschedule')}
      </button>
    </div>
  );
}

function QuickEditPanel({
  customer,
  groups,
  onSaved,
  onError,
}: {
  customer: PosCustomerReviewRow;
  groups: CustomerGroupDto[];
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const { t } = useLanguage();
  const [notes, setNotes] = useState(customer.notes || '');
  const [groupId, setGroupId] = useState(customer.customer_group);
  const [spouse, setSpouse] = useState(customer.spouse_name || '');
  const [guarantors, setGuarantors] = useState(customer.guarantor_summary || customer.guarantor_name || '');
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
          spouse_name: spouse,
          guarantor_summary: guarantors,
        },
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="psc-acc-edit-form">
      <div className="psc-acc-edit-grid">
        <label className="psc-acc-field">
          {t('pos.smart.accounts.editGroupLevel')}
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name_ar}
              </option>
            ))}
          </select>
        </label>
        <label className="psc-acc-field">
          {t('pos.smart.accounts.editSpouse')}
          <input value={spouse} onChange={(e) => setSpouse(e.target.value)} />
        </label>
        <label className="psc-acc-field psc-acc-field--full">
          {t('pos.smart.accounts.editGuarantors')}
          <input value={guarantors} onChange={(e) => setGuarantors(e.target.value)} />
        </label>
        <label className="psc-acc-field psc-acc-field--full">
          {t('pos.smart.accounts.editNotesCredit')}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
        </label>
      </div>
      <button type="button" className="psc-acc-edit-save" disabled={saving} onClick={() => void save()}>
        <Save className="h-4 w-4" />
        {t('pos.smart.accounts.saveEdits')}
      </button>
    </div>
  );
}
