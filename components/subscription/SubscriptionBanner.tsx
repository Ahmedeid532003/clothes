import { AlertTriangle, CalendarClock, CreditCard, Snowflake } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { TenantSubscription } from '@/lib/api/auth';

type Props = {
  subscription: TenantSubscription | null | undefined;
  /** يثبت الشريط تحت الهيدر في كل الشاشات */
  sticky?: boolean;
};

function bannerStyles(status: string) {
  switch (status) {
    case 'frozen':
      return 'border-red-200 bg-gradient-to-r from-red-50 via-white to-white text-red-950 before:bg-red-500';
    case 'grace':
      return 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-white text-amber-950 before:bg-amber-500';
    case 'critical':
      return 'border-orange-200 bg-gradient-to-r from-orange-50 via-white to-white text-orange-950 before:bg-orange-500';
    case 'warning':
      return 'border-yellow-200 bg-gradient-to-r from-yellow-50 via-white to-white text-yellow-900 before:bg-yellow-500';
    case 'ok':
      return 'border-blue-200 bg-gradient-to-r from-blue-50 via-white to-white text-blue-950 before:bg-blue-500';
    default:
      return 'border-slate-200 bg-white text-slate-800 before:bg-slate-400';
  }
}

export function SubscriptionBanner({ subscription, sticky = false }: Props) {
  const { locale, t } = useLanguage();

  const shouldShowBanner =
    Boolean(subscription?.show_banner) ||
    ['warning', 'critical', 'grace', 'frozen', 'none'].includes(subscription?.status ?? '');

  if (!subscription || !shouldShowBanner || subscription.status === 'ok') {
    return null;
  }

  const message =
    locale === 'ar' ? subscription.message_ar : subscription.message_en || subscription.message_ar;

  const Icon =
    subscription.status === 'frozen'
      ? Snowflake
      : subscription.status === 'grace' || subscription.status === 'critical'
        ? AlertTriangle
        : CalendarClock;

  const wrapperClass = sticky
    ? 'subscription-premium-banner sticky z-[65] shrink-0 px-4 py-2.5 md:px-8'
    : 'subscription-premium-banner mb-4 rounded-xl border px-4 py-3';

  return (
    <div
      className={`${wrapperClass} relative overflow-hidden ${bannerStyles(subscription.status)}`}
      role="alert"
      aria-live="polite"
    >
      <div className="subscription-banner-inner flex flex-wrap items-center gap-3">
        <span className="subscription-banner-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="subscription-banner-copy min-w-0 flex-1">
          <p className="subscription-banner-title font-bold text-sm leading-snug">{t('subscription.bannerTitle')}</p>
          <p className="subscription-banner-message text-sm leading-snug opacity-95">{message}</p>
          {subscription.ends_at && (
            <p className="subscription-banner-meta mt-0.5 text-xs opacity-90">
              {t('subscription.endsAt')}: <strong>{subscription.ends_at}</strong>
              {subscription.deadline && (
                <>
                  {' '}
                  · {t('subscription.deadline')}: <strong>{subscription.deadline}</strong>
                </>
              )}
              {subscription.days_until_end != null && subscription.days_until_end >= 0 && (
                <>
                  {' '}
                  · {t('subscription.daysLeft', { count: subscription.days_until_end })}
                </>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'payment-methods-dashboard' }))}
          className="subscription-pay-action inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-extrabold"
        >
          <CreditCard className="h-4 w-4" />
          {locale === 'ar' ? 'دفع الاشتراك' : 'Pay subscription'}
        </button>
      </div>
    </div>
  );
}
