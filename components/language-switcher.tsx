import { ChevronDown, Globe, Languages } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/types';

type LanguageSwitcherProps = {
  variant?: 'header' | 'sidebar';
  className?: string;
};

export function LanguageSwitcher({
  variant = 'header',
  className,
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLanguage();

  const toggle = () => setLocale(locale === 'en' ? 'ar' : 'en');
  const targetCode = locale === 'ar' ? 'EN' : 'AR';

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'sidebar-language-trigger flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-3 py-2 text-xs font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          className
        )}
        aria-label={t('language.label')}
      >
        <Languages size={16} className="shrink-0 text-blue-400" />
        <span className="flex-1 text-start">{t('language.label')}</span>
        <span className="rounded-md bg-sidebar-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          {targetCode}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn('app-language-pill', className)}
      aria-label={t('language.label')}
    >
      <span className="app-language-pill-code">{targetCode}</span>
      <Globe size={17} className="app-language-pill-icon" aria-hidden />
    </button>
  );
}

export function LocaleBadge({ locale }: { locale: Locale }) {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
      {locale}
    </span>
  );
}
