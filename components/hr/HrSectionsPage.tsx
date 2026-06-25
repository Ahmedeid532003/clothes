import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers3, RefreshCw, Save, Tag } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchDepartments, type DepartmentDto } from '@/lib/api/departments';
import {
  createHrSection,
  deleteHrSection,
  fetchHrSections,
  updateHrSection,
  type HrSectionDto,
} from '@/lib/api/hr-sections';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ErpRowActions } from '@/components/erp/ErpRowActions';

export function HrSectionsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<HrSectionDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [filterDept, setFilterDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HrSectionDto | null>(null);
  const [form, setForm] = useState({ department_id: '', code: '', name: '' });

  const activeDepartment = useMemo(
    () => departments.find((department) => department.id === form.department_id),
    [departments, form.department_id],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [depts, list] = await Promise.all([
        fetchDepartments(),
        fetchHrSections(filterDept || undefined),
      ]);
      setDepartments(depts);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterDept]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      department_id: filterDept || departments[0]?.id || '',
      code: '',
      name: '',
    });
    setOpen(true);
  };

  const openEdit = (row: HrSectionDto) => {
    setEditing(row);
    setForm({ department_id: row.department_id, code: row.code, name: row.name });
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.name.trim() || (!editing && !form.department_id)) return;
    try {
      if (editing) {
        await updateHrSection(editing.id, { name: form.name.trim() });
      } else {
        await createHrSection({
          department_id: form.department_id,
          name: form.name.trim(),
          code: form.code.trim() || undefined,
        });
      }
      setOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <HrModuleLayout activeTab="hr-sections">
      <div className="hr-sections-page">
        <div className="hr-sections-title-row">
          <div>
            <h1>{t('hrSections.title')}</h1>
            <p>{t('hrSections.desc')}</p>
          </div>
        </div>

        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="hr-sections-filter-row">
          <ErpAddButton onClick={openAdd}>{t('hrSections.add')}</ErpAddButton>
          <Button variant="outline" size="sm" onClick={load} className="hr-sections-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <div className="hr-sections-filter-control">
            <label>{t('hrSections.filterDept')}</label>
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
              <option value="">{t('hrSections.allDepts')}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="hr-sections-table-card">
          <table>
            <thead>
              <tr>
                <th>{t('hrSections.colDept')}</th>
                <th>{t('departments.columns.id')}</th>
                <th>{t('departments.columns.name')}</th>
                <th className="text-end">{t('erpTable.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="hr-sections-empty">
                    {t('inventory.loading')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="hr-sections-empty">
                    {t('hrSections.empty')}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="hr-sections-dept">
                        <Layers3 className="h-4 w-4" />
                        {r.department_name}
                        <small>{r.department_code}</small>
                      </span>
                    </td>
                    <td>
                      <span className="hr-sections-code">{r.code}</span>
                    </td>
                    <td className="font-extrabold text-slate-800">{r.name}</td>
                    <td className="text-end">
                      <ErpRowActions
                        onEdit={() => openEdit(r)}
                        onDelete={async () => {
                          if (!confirm(t('departments.delete') + '?')) return;
                          await deleteHrSection(r.id);
                          load();
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="hr-sections-add-sheet border-0 p-0 sm:max-w-[34rem]">
          <SheetHeader className="hr-sections-add-header">
            <SheetTitle>{editing ? t('hrSections.edit') : t('hrSections.add')}</SheetTitle>
            <p>أدخل بيانات السجل الجديد بنفس الشكل المنظم.</p>
          </SheetHeader>
          <div className="hr-sections-add-body">
            <div className="hr-sections-add-card">
              <h3>{editing ? t('hrSections.edit') : t('hrSections.add')}</h3>
            {!editing ? (
              <div className="hr-sections-form-field">
                <label>{t('hrSections.colDept')} *</label>
                <div className="hr-sections-input-wrap is-focused">
                  <Layers3 className="h-5 w-5" />
                <select
                  value={form.department_id}
                  onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
                  <span>⌄</span>
                </div>
              </div>
            ) : null}
            {!editing ? (
              <div className="hr-sections-form-field">
                <label>{t('departments.deptCode')}</label>
                <div className="hr-sections-input-wrap">
                  <Tag className="h-5 w-5" />
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="S-01"
                />
                </div>
              </div>
            ) : null}
            <div className="hr-sections-form-field">
              <label>{t('departments.deptName')} *</label>
              <div className="hr-sections-input-wrap">
                <Layers3 className="h-5 w-5" />
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              </div>
            </div>
              {activeDepartment ? (
                <div className="hr-sections-form-preview">
                  <span>{activeDepartment.code}</span>
                  <strong>{activeDepartment.name}</strong>
                </div>
              ) : null}
            </div>
          </div>
          <SheetFooter className="hr-sections-add-footer">
            <Button onClick={onSave} className="erp-add-save-action">
              {t('departments.save')}
              <Save className="h-4 w-4 ms-2" />
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </HrModuleLayout>
  );
}
