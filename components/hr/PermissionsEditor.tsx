import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PermissionsSchemaDto, UserPermissions } from '@/lib/api/employees';

type Props = {
  schema: PermissionsSchemaDto;
  value: UserPermissions;
  onChange: (next: UserPermissions) => void;
  disabled?: boolean;
};

export const PermissionsEditor: React.FC<Props> = ({
  schema,
  value,
  onChange,
  disabled,
}) => {
  const { isRtl } = useLanguage();
  const label = (en: string, ar: string) => (isRtl ? ar : en);

  const setPage = (key: string, checked: boolean) => {
    onChange({ ...value, pages: { ...value.pages, [key]: checked } });
  };

  const setFeature = (pageKey: string, featureKey: string, checked: boolean) => {
    onChange({
      ...value,
      features: {
        ...value.features,
        [pageKey]: { ...value.features[pageKey], [featureKey]: checked },
      },
    });
  };

  const setAction = (
    pageKey: string,
    action: 'view' | 'update' | 'delete',
    checked: boolean,
  ) => {
    onChange({
      ...value,
      actions: {
        ...value.actions,
        [pageKey]: { ...value.actions[pageKey], [action]: checked },
      },
    });
  };

  return (
    <div className="hr-permissions-editor space-y-4">
      {schema.pages.map((page) => {
        const pageFeatures = schema.features[page.key] ?? [];
        const pageOpen = !!value.pages[page.key];
        return (
          <div
            key={page.key}
            className={cn(
              'hr-permission-card border border-slate-200 rounded-xl overflow-hidden',
              !pageOpen && 'opacity-80',
            )}
          >
            <label className="hr-permission-card-head flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={pageOpen}
                disabled={disabled}
                onChange={(e) => setPage(page.key, e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="text-sm font-bold text-slate-800">
                {label(page.label_en, page.label_ar)}
              </span>
            </label>

            {pageOpen && (
              <div className="px-4 py-3 space-y-4 border-t border-slate-100">
                {pageFeatures.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {label('Visible inside page', 'ما يظهر داخل الصفحة')}
                    </p>
                    <div className="space-y-2">
                      {pageFeatures.map((f) => (
                        <label
                          key={f.key}
                          className="hr-permission-check-row"
                        >
                          <input
                            type="checkbox"
                            checked={!!value.features[page.key]?.[f.key]}
                            disabled={disabled}
                            onChange={(e) =>
                              setFeature(page.key, f.key, e.target.checked)
                            }
                            className="rounded border-slate-300 text-blue-600"
                          />
                          {label(f.label_en, f.label_ar)}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    {label('Actions (view / update / delete)', 'الإجراءات (عرض / تعديل / حذف)')}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {(['view', 'update', 'delete'] as const).map((action) => (
                      <label
                        key={action}
                        className="hr-permission-check-row"
                      >
                        <input
                          type="checkbox"
                          checked={!!value.actions[page.key]?.[action]}
                          disabled={disabled}
                          onChange={(e) =>
                            setAction(page.key, action, e.target.checked)
                          }
                          className="rounded border-slate-300 text-blue-600"
                        />
                        {action === 'view'
                          ? label('View', 'عرض')
                          : action === 'update'
                            ? label('Update', 'تعديل')
                            : label('Delete', 'حذف')}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
