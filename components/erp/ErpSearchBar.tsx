import React from 'react';
import { Filter, Search } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  advancedOpen?: boolean;
  onAdvancedToggle?: () => void;
  showAdvanced?: boolean;
  className?: string;
  inputClassName?: string;
  'aria-label'?: string;
};

export function ErpSearchBar({
  value,
  onChange,
  placeholder,
  advancedOpen = false,
  onAdvancedToggle,
  showAdvanced = true,
  className,
  inputClassName,
  'aria-label': ariaLabel,
}: Props) {
  const { t } = useLanguage();
  const showAdv = showAdvanced && onAdvancedToggle;

  return (
    <div className={cn('erp-search-bar', className)}>
      <div className="erp-search-bar-field">
        <Search className="erp-search-bar-icon" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t('erpTable.quickSearch')}
          aria-label={ariaLabel ?? placeholder ?? t('erpTable.quickSearch')}
          className={cn('erp-search-bar-input', inputClassName)}
        />
      </div>
      {showAdv ? (
        <button
          type="button"
          className={cn('erp-search-bar-advanced', advancedOpen && 'is-active')}
          onClick={onAdvancedToggle}
          aria-expanded={advancedOpen}
        >
          <Filter className="erp-search-bar-advanced-icon" aria-hidden />
          <span>{t('erpTable.advancedSearch')}</span>
        </button>
      ) : null}
    </div>
  );
}
