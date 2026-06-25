import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Store, User } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  customerTypesApi,
  fetchCustomerMeta,
  type CustomerTypeDto,
  type WorkflowStep,
} from '@/lib/api/customers';
import { CUSTOMER_TYPE_SLUGS, FIELD_CATALOG_KEYS, VISIBILITY_ROLES } from '@/lib/customers/defaults';
import { AlertBanner, DataCard, PageToolbar, StatusBadge, appNavigate } from '@/components/accounting/AccountingUi';
import { CrmPageHeader, CustomersModuleLayout } from '@/components/customers/CustomersUi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ErpRowActions } from '@/components/erp/ErpRowActions';

const SLUG_ICON: Record<string, React.ReactNode> = {
  establishment: <Building2 className="h-8 w-8" />,
  shop: <Store className="h-8 w-8" />,
  individual: <User className="h-8 w-8" />,
};

export function CustomerTypesPage() {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<CustomerTypeDto[]>([]);
  const [catalog, setCatalog] = useState<Record<string, { label_ar: string; label_en: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerTypeDto | null>(null);
  const [form, setForm] = useState({
    slug: 'individual',
    name_ar: '',
    name_en: '',
    description: '',
    is_active: true,
    mandatory_fields: [] as string[],
    field_visibility: {} as Record<string, string[]>,
    workflow_steps: [] as WorkflowStep[],
    form_schema_keys: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meta = await fetchCustomerMeta();
      setRows(meta.types);
      setCatalog(meta.field_catalog);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (row: CustomerTypeDto) => {
    setEditing(row);
    setForm({
      slug: row.slug,
      name_ar: row.name_ar,
      name_en: row.name_en,
      description: row.description,
      is_active: row.is_active,
      mandatory_fields: [...row.mandatory_fields],
      field_visibility: { ...row.field_visibility },
      workflow_steps: [...row.workflow_steps],
      form_schema_keys: row.form_schema.map((f) => f.key),
    });
    setOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      slug: 'individual',
      name_ar: '',
      name_en: '',
      description: '',
      is_active: true,
      mandatory_fields: [],
      field_visibility: { owner: ['*'], manager: ['*'], sales: [], accountant: ['*'] },
      workflow_steps: [
        { key: 'draft', label_ar: 'مسودة', label_en: 'Draft' },
        { key: 'active', label_ar: 'نشط', label_en: 'Active' },
      ],
      form_schema_keys: ['name_ar', 'phone', 'national_id'],
    });
    setOpen(true);
  };

  const toggleMandatory = (key: string) => {
    setForm((f) => ({
      ...f,
      mandatory_fields: f.mandatory_fields.includes(key)
        ? f.mandatory_fields.filter((k) => k !== key)
        : [...f.mandatory_fields, key],
    }));
  };

  const toggleSchemaKey = (key: string) => {
    setForm((f) => ({
      ...f,
      form_schema_keys: f.form_schema_keys.includes(key)
        ? f.form_schema_keys.filter((k) => k !== key)
        : [...f.form_schema_keys, key],
    }));
  };

  const toggleVisibility = (role: string, key: string) => {
    setForm((f) => {
      const cur = f.field_visibility[role] || [];
      const all = cur.includes('*');
      let next: string[];
      if (key === '*') {
        next = all ? [] : ['*'];
      } else if (all) {
        next = FIELD_CATALOG_KEYS.filter((k) => k !== key);
      } else if (cur.includes(key)) {
        next = cur.filter((k) => k !== key);
      } else {
        next = [...cur, key];
      }
      return { ...f, field_visibility: { ...f.field_visibility, [role]: next } };
    });
  };

  const onSave = async () => {
    setError(null);
    const form_schema = form.form_schema_keys.map((key) => ({
      key,
      section: ['phone', 'whatsapp', 'email', 'address'].includes(key)
        ? 'contact'
        : key === 'notes'
          ? 'other'
          : 'main',
    }));
    const payload = {
      slug: form.slug,
      name_ar: form.name_ar,
      name_en: form.name_ar.trim(),
      description: form.description,
      is_active: form.is_active,
      mandatory_fields: form.mandatory_fields,
      field_visibility: form.field_visibility,
      workflow_steps: form.workflow_steps,
      form_schema,
    };
    try {
      if (editing) await customerTypesApi.update(editing.id, payload);
      else await customerTypesApi.create(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const fieldLabel = (key: string) =>
    locale === 'ar'
      ? catalog[key]?.label_ar ?? key
      : catalog[key]?.label_en ?? catalog[key]?.label_ar ?? key;

  return (
    <CustomersModuleLayout>
      <CrmPageHeader
        title={t('nav.customerTypes')}
        description={t('customers.typesDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 me-1" />
              {t('customers.addType')}
            </Button>
          </PageToolbar>
        }
      />
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-slate-500 col-span-full py-8 text-center">{t('inventory.loading')}</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex gap-3 items-center text-blue-800">
                  {SLUG_ICON[row.slug] ?? <User className="h-8 w-8" />}
                  <div>
                    <p className="font-bold">{row.name_ar}</p>
                    <p className="text-xs font-mono text-slate-500">{row.code}</p>
                  </div>
                </div>
                <StatusBadge
                  status={row.is_active ? 'posted' : 'cancelled'}
                  label={row.is_active ? t('customers.active') : t('customers.inactive')}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{row.description || '—'}</p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-600">
                <span>{row.form_schema.length} {t('customers.fields')}</span>
                <span>·</span>
                <span>{row.mandatory_fields.length} {t('customers.mandatory')}</span>
                <span>·</span>
                <span>{row.customers_count} {t('customers.clients')}</span>
              </div>
              <div className="mt-3 flex justify-end">
                <ErpRowActions
                  onView={() => appNavigate('customers')}
                  onEdit={() => openEdit(row)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? t('customers.editType') : t('customers.addType')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {!editing?.is_system && (
              <div>
                <label className="text-xs font-medium">{t('customers.typeSlug')}</label>
                <select
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                >
                  {CUSTOMER_TYPE_SLUGS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {locale === 'ar' ? s.labelAr : s.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Input
              placeholder={t('accounting.nameAr')}
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              {t('customers.typeActive')}
            </label>

            <DataCard title={t('customers.formFields')}>
              <div className="p-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {FIELD_CATALOG_KEYS.map((key) => (
                  <label
                    key={key}
                    className={`text-xs px-2 py-1 rounded-full border cursor-pointer ${
                      form.form_schema_keys.includes(key)
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.form_schema_keys.includes(key)}
                      onChange={() => toggleSchemaKey(key)}
                    />
                    {fieldLabel(key)}
                  </label>
                ))}
              </div>
            </DataCard>

            <DataCard title={t('customers.mandatoryFields')}>
              <div className="p-3 flex flex-wrap gap-2">
                {form.form_schema_keys.map((key) => (
                  <label
                    key={key}
                    className={`text-xs px-2 py-1 rounded-full border cursor-pointer ${
                      form.mandatory_fields.includes(key) ? 'bg-amber-100 border-amber-300' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.mandatory_fields.includes(key)}
                      onChange={() => toggleMandatory(key)}
                    />
                    {fieldLabel(key)}
                  </label>
                ))}
              </div>
            </DataCard>

            <DataCard title={t('customers.visibility')}>
              <div className="p-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-start py-1">{t('customers.role')}</th>
                      <th className="text-start py-1">{t('customers.allFields')}</th>
                      {form.form_schema_keys.slice(0, 4).map((k) => (
                        <th key={k} className="text-start py-1">
                          {fieldLabel(k)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {VISIBILITY_ROLES.map((role) => (
                      <tr key={role.key} className="border-t">
                        <td className="py-1 font-medium">
                          {locale === 'ar' ? role.labelAr : role.labelEn}
                        </td>
                        <td className="py-1">
                          <input
                            type="checkbox"
                            checked={(form.field_visibility[role.key] || []).includes('*')}
                            onChange={() => toggleVisibility(role.key, '*')}
                          />
                        </td>
                        {form.form_schema_keys.slice(0, 4).map((k) => (
                          <td key={k} className="py-1">
                            <input
                              type="checkbox"
                              checked={
                                (form.field_visibility[role.key] || []).includes('*') ||
                                (form.field_visibility[role.key] || []).includes(k)
                              }
                              onChange={() => toggleVisibility(role.key, k)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataCard>

            <DataCard title={t('customers.workflow')}>
              <div className="p-3 space-y-2">
                {form.workflow_steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-xs font-mono w-6">{idx + 1}</span>
                    <Input
                      className="h-8 text-xs flex-1"
                      value={step.label_ar}
                      onChange={(e) => {
                        const next = [...form.workflow_steps];
                        next[idx] = { ...step, label_ar: e.target.value };
                        setForm({ ...form, workflow_steps: next });
                      }}
                    />
                    <Input
                      className="h-8 text-xs w-24 font-mono"
                      value={step.key}
                      onChange={(e) => {
                        const next = [...form.workflow_steps];
                        next[idx] = { ...step, key: e.target.value };
                        setForm({ ...form, workflow_steps: next });
                      }}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      workflow_steps: [
                        ...form.workflow_steps,
                        { key: `step_${form.workflow_steps.length + 1}`, label_ar: '', label_en: '' },
                      ],
                    })
                  }
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </DataCard>
          </div>
          <SheetFooter>
            <Button onClick={onSave}>{t('departments.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </CustomersModuleLayout>
  );
}
