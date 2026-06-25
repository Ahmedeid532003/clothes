import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  customersApi,
  fetchCustomerMeta,
  type CustomerDto,
  type CustomerTypeDto,
} from '@/lib/api/customers';
import { SmartCustomerForm, type SmartFormState } from '@/components/customers/SmartCustomerForm';
import { CustomerSmartActions } from '@/components/customers/CustomerSmartActions';
import { AlertBanner, StatusBadge, fmtMoney } from '@/components/accounting/AccountingUi';
import {
  CrmKpiCard,
  CustomerTypeBadge,
  CustomersModuleLayout,
  crmSelectClass,
  listStats,
} from '@/components/customers/CustomersUi';
import { ErpDataTable, type ErpColumn } from '@/components/erp/ErpDataTable';
import { ErpCrudPage } from '@/components/erp/ErpCrudPage';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import { ErpRowActions } from '@/components/erp/ErpRowActions';
import { matchesCustomerSearch } from '@/lib/customers/profileExtras';

const emptyForm = (): SmartFormState => ({
  profile: {},
  workflow_status: 'draft',
  customer_group: '',
  notes: '',
});

export function CustomersPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CustomerDto[]>([]);
  const [types, setTypes] = useState<CustomerTypeDto[]>([]);
  const [groups, setGroups] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [selectedType, setSelectedType] = useState<CustomerTypeDto | null>(null);
  const [previewCode, setPreviewCode] = useState('');
  const [form, setForm] = useState<SmartFormState>(emptyForm());
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stoppedOnly, setStoppedOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, meta] = await Promise.all([customersApi.list(), fetchCustomerMeta()]);
      setRows(list);
      setTypes(meta.types);
      setGroups(meta.groups.map((g) => ({ id: g.id, label: g.path_label || g.name_ar })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter && r.customer_type !== typeFilter) return false;
      if (stoppedOnly && !r.is_stopped) return false;
      if (!q) return true;
      return matchesCustomerSearch(r, q);
    });
  }, [rows, search, typeFilter, stoppedOnly]);

  const stats = useMemo(() => listStats(filtered), [filtered]);

  const applyType = (typeId: string) => {
    const ty = types.find((x) => x.id === typeId);
    setSelectedType(ty ?? null);
    setForm((f) => ({
      ...f,
      workflow_status: ty?.workflow_steps?.[0]?.key ?? 'draft',
      profile: {},
    }));
  };

  const openNew = async () => {
    const ty = types.find((t) => t.slug === 'shop') ?? types[0];
    setEditing(null);
    setSelectedType(ty ?? null);
    setAllowDuplicate(false);
    setForm({
      ...emptyForm(),
      customer_group: groups[0]?.id ?? '',
      workflow_status: ty?.workflow_steps?.[0]?.key ?? 'draft',
    });
    try {
      const { code } = await customersApi.nextCode();
      setPreviewCode(code);
    } catch {
      setPreviewCode('');
    }
    setOpen(true);
  };

  const openEdit = async (row: CustomerDto) => {
    setAllowDuplicate(false);
    try {
      const detail = await customersApi.get(row.id);
      setEditing(detail);
      setSelectedType(types.find((x) => x.id === detail.customer_type) ?? null);
      setPreviewCode(detail.code);
      setForm({
        customer_group: detail.customer_group,
        workflow_status: detail.workflow_status,
        notes: detail.notes,
        profile: { ...(detail.profile_data || {}) },
      });
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const onSave = async () => {
    if (!selectedType || !form.customer_group) return;
    setError(null);
    try {
      const profile = { ...form.profile };
      if (selectedType.slug === 'shop') profile.shop_name = String(profile.shop_name || '');
      const payload = {
        customer_type: selectedType.id,
        customer_group: form.customer_group,
        workflow_status: form.workflow_status,
        notes: form.notes,
        profile_data: profile,
        allow_duplicate: allowDuplicate,
        credit_score: profile.credit_score_display
          ? Number(profile.credit_score_display)
          : undefined,
      };
      if (editing) await customersApi.update(editing.id, payload);
      else await customersApi.create(payload);
      setOpen(false);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      if (msg.includes('duplicate') || msg.includes('تكرار')) setAllowDuplicate(true);
      setError(msg);
    }
  };

  const slug = selectedType?.slug ?? 'shop';

  const removeRow = async (row: CustomerDto) => {
    if (!window.confirm(`حذف العميل ${row.name_ar}؟`)) return;
    setError(null);
    try {
      await customersApi.remove(row.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const columns = useMemo<ErpColumn<CustomerDto>[]>(
    () => [
      {
        key: 'code',
        header: t('inventory.code'),
        render: (row) => <span className="font-mono text-xs font-bold text-blue-700">{row.code}</span>,
        exportValue: (row) => row.code,
      },
      {
        key: 'name',
        header: t('accounting.colName'),
        render: (row) => (
          <div>
            <div className="font-semibold text-slate-900">{row.name_ar}</div>
            {row.is_stopped ? (
              <span className="text-[10px] font-bold text-red-600">{row.stop_reason || '—'}</span>
            ) : null}
          </div>
        ),
        exportValue: (row) => row.name_ar,
      },
      {
        key: 'type',
        header: t('customers.type'),
        render: (row) => <CustomerTypeBadge slug={row.customer_type_slug} />,
        exportValue: (row) => row.customer_type_name,
      },
      {
        key: 'group',
        header: t('customers.group'),
        render: (row) => <span className="text-xs text-slate-600">{row.customer_group_path}</span>,
        exportValue: (row) => row.customer_group_path,
      },
      {
        key: 'phone',
        header: 'الهاتف',
        render: (row) => row.phone || row.whatsapp || '—',
        exportValue: (row) => row.phone || row.whatsapp,
      },
      {
        key: 'spouse',
        header: t('customers.colSpouse'),
        render: (row) => row.spouse_name || '—',
        exportValue: (row) => row.spouse_name || '',
      },
      {
        key: 'guarantors',
        header: t('customers.colGuarantors'),
        render: (row) => (
          <span className="text-xs text-slate-600 max-w-[200px] truncate block" title={row.guarantor_summary || ''}>
            {row.guarantor_summary || '—'}
          </span>
        ),
        exportValue: (row) => row.guarantor_summary || '',
      },
      {
        key: 'status',
        header: t('inventory.status'),
        render: (row) => (
          <StatusBadge
            status={row.workflow_status === 'active' ? 'posted' : 'draft'}
            label={row.workflow_steps.find((s) => s.key === row.workflow_status)?.label_ar ?? row.workflow_status}
          />
        ),
        exportValue: (row) => row.workflow_status,
      },
      {
        key: 'sales',
        header: t('customers.sales'),
        align: 'end',
        render: (row) => <span className="tabular-nums font-medium">{fmtMoney(row.total_sales)}</span>,
        exportValue: (row) => row.total_sales,
      },
      {
        key: 'arrears',
        header: t('customers.arrears'),
        align: 'end',
        render: (row) => <span className="tabular-nums text-amber-800">{fmtMoney(row.balance_due)}</span>,
        exportValue: (row) => row.balance_due,
      },
    ],
    [t],
  );

  return (
    <CustomersModuleLayout>
      <ErpCrudPage
        title={t('nav.customersList')}
        description={t('customers.listDesc')}
        breadcrumbs={[
          { label: t('nav.customers') },
          { label: t('nav.customersList') },
        ]}
        stats={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CrmKpiCard label={t('customers.totalCustomers')} value={stats.count} icon={<UserPlus className="h-5 w-5" />} />
            <CrmKpiCard label={t('customers.sales')} value={stats.sales} tone="ok" />
            <CrmKpiCard label={t('customers.arrears')} value={stats.due} tone="warn" />
            <CrmKpiCard label={t('customers.smartEnabled')} value={types.length} tone="info" />
          </div>
        }
      >

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {!types.length ? <AlertBanner variant="warning">{t('customers.setupTypes')}</AlertBanner> : null}

      <ErpDataTable
        title={t('nav.customersList')}
        description="جدول بيانات موحد مع تصدير، اختيار أعمدة، بحث متقدم، وترقيم صفحات."
        rows={filtered}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        emptyMessage={t('customers.empty')}
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={openNew}
        onImport={() => window.alert('سيتم ربط استيراد البيانات بملف Excel/CSV في الخطوة التالية.')}
        onRowClick={openEdit}
        addLabel={t('customers.addCustomer')}
        advancedFilters={
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className={crmSelectClass()}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">{t('customers.filterAllTypes')}</option>
              {types.map((ty) => (
                <option key={ty.id} value={ty.id}>
                  {ty.name_ar}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={stoppedOnly} onChange={(e) => setStoppedOnly(e.target.checked)} />
              {t('customers.filterStopped')}
            </label>
          </div>
        }
        renderRowActions={(row) => (
          <ErpRowActions
            onView={() => openEdit(row)}
            onEdit={() => openEdit(row)}
            onDelete={() => removeRow(row)}
          />
        )}
      />

      <ErpSideDrawer
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('customers.editCustomer') : t('customers.addCustomer')}
        description={t('customers.dynamicFormHint')}
        onSave={onSave}
        saveLabel={t('departments.save')}
        disabled={!selectedType || !form.customer_group}
        width="wide"
      >
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">{t('customers.type')} *</label>
                <select
                  className={crmSelectClass()}
                  value={selectedType?.id ?? ''}
                  disabled={!!editing}
                  onChange={(e) => applyType(e.target.value)}
                >
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
                  className={crmSelectClass()}
                  value={form.customer_group}
                  onChange={(e) => setForm({ ...form, customer_group: e.target.value })}
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedType && (
              <>
                <select
                  className={crmSelectClass()}
                  value={form.workflow_status}
                  onChange={(e) => setForm({ ...form, workflow_status: e.target.value })}
                >
                  {selectedType.workflow_steps.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label_ar}
                    </option>
                  ))}
                </select>

                {(editing || previewCode) && (
                  <CustomerSmartActions
                    code={editing?.code ?? previewCode}
                    phone={String(form.profile.phone || form.profile.owner_phone || editing?.phone || '')}
                    whatsapp={String(form.profile.whatsapp || editing?.whatsapp || '')}
                    gpsLat={String(form.profile.gps_lat || editing?.gps_lat || '')}
                    gpsLng={String(form.profile.gps_lng || editing?.gps_lng || '')}
                  />
                )}

                <SmartCustomerForm
                  slug={slug}
                  state={form}
                  customerCode={editing?.code ?? previewCode}
                  excludeId={editing?.id}
                  readOnlyStats={
                    editing
                      ? {
                          last_activity_at: editing.last_activity_at,
                          purchase_count: editing.purchase_count,
                          avg_purchase_amount: editing.avg_purchase_amount,
                          credit_score: editing.credit_score,
                        }
                      : undefined
                  }
                  onProfileChange={(key, val) =>
                    setForm((f) => ({ ...f, profile: { ...f.profile, [key]: val } }))
                  }
                />

                {allowDuplicate ? (
                  <AlertBanner variant="warning">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={allowDuplicate}
                        onChange={(e) => setAllowDuplicate(e.target.checked)}
                      />
                      {t('customers.duplicateWarning')}
                    </label>
                  </AlertBanner>
                ) : null}

                {editing?.activities?.length ? (
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <h4 className="text-sm font-bold mb-2">{t('customers.activityLog')}</h4>
                    <ul className="space-y-2 text-xs text-slate-600 max-h-40 overflow-y-auto">
                      {editing.activities.map((a) => (
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
              </>
            )}
          </div>
      </ErpSideDrawer>
      </ErpCrudPage>
    </CustomersModuleLayout>
  );
}
