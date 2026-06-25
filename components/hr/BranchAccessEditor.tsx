import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { BranchDto } from '@/lib/api/branches';
import { entityName } from '@/lib/entity-name';
import type { BranchAccessMode } from '@/lib/api/auth';

type Props = {
  branches: BranchDto[];
  mode: BranchAccessMode;
  onModeChange: (mode: BranchAccessMode) => void;
  selectedBranchIds: string[];
  onSelectedChange: (ids: string[]) => void;
  defaultBranchId: string;
  onDefaultBranchChange: (id: string) => void;
  disabled?: boolean;
};

export function BranchAccessEditor({
  branches,
  mode,
  onModeChange,
  selectedBranchIds,
  onSelectedChange,
  defaultBranchId,
  onDefaultBranchChange,
  disabled,
}: Props) {
  const { t } = useLanguage();

  const toggleBranch = (id: string) => {
    if (disabled) return;
    if (selectedBranchIds.includes(id)) {
      const next = selectedBranchIds.filter((x) => x !== id);
      onSelectedChange(next);
      if (defaultBranchId === id) onDefaultBranchChange(next[0] ?? '');
    } else {
      const next = [...selectedBranchIds, id];
      onSelectedChange(next);
      if (!defaultBranchId) onDefaultBranchChange(id);
    }
  };

  return (
    <div className="hr-branch-access-editor space-y-4">
      <div>
        <p className="text-sm font-black text-slate-900">{t('createUsers.branchAccessTitle')}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">حدد نطاق الفروع المتاح للموظف مع الفرع الافتراضي.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'single', 'multiple'] as BranchAccessMode[]).map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => {
              onModeChange(m);
              if (m === 'all') {
                onSelectedChange([]);
                onDefaultBranchChange('');
              } else if (m === 'single' && branches[0]) {
                onSelectedChange([branches[0].id]);
                onDefaultBranchChange(branches[0].id);
              }
            }}
            className={cn(
              'rounded-xl px-3 py-2 text-xs font-black border transition-all duration-200',
              mode === m
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {t(`createUsers.branchMode.${m}`)}
          </button>
        ))}
      </div>

      {mode === 'single' && (
        <div className="hr-branch-access-field">
          <label className="text-xs font-bold text-slate-500 uppercase">
            {t('createUsers.branchSingle')}
          </label>
          <select
            disabled={disabled}
            value={defaultBranchId}
            onChange={(e) => {
              const id = e.target.value;
              onDefaultBranchChange(id);
              onSelectedChange(id ? [id] : []);
            }}
            className="mt-1 w-full h-11 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="">{t('createUsers.branchSelect')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {entityName(b)}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === 'multiple' && (
        <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-white/70 p-3">
          <p className="text-xs text-slate-500">{t('createUsers.branchMultipleHint')}</p>
          {branches.map((b) => {
            const label = entityName(b);
            const checked = selectedBranchIds.includes(b.id);
            return (
              <label key={b.id} className="hr-branch-check-row">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={checked}
                  onChange={() => toggleBranch(b.id)}
                />
                <span>{label}</span>
              </label>
            );
          })}
          {selectedBranchIds.length > 1 && (
            <div className="pt-3 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-500 uppercase">
                {t('createUsers.branchDefault')}
              </label>
              <select
                disabled={disabled}
                value={defaultBranchId}
                onChange={(e) => onDefaultBranchChange(e.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
              >
                {selectedBranchIds.map((id) => {
                  const b = branches.find((x) => x.id === id);
                  if (!b) return null;
                  return (
                    <option key={id} value={id}>
                      {entityName(b)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      )}

      {mode === 'all' && (
        <p className="text-xs text-slate-500">{t('createUsers.branchAllHint')}</p>
      )}
    </div>
  );
}
