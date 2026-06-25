import { splitMoneyHero, type MoneyLocale } from '@/lib/money';
import { cn } from '@/lib/utils';

type Props = {
  amount: string | number | undefined;
  locale?: MoneyLocale;
  size?: 'md' | 'lg' | 'xl';
  currencyLabel?: string;
  className?: string;
};

export function PaymentAmountHero({
  amount,
  locale = 'ar',
  size = 'lg',
  currencyLabel,
  className,
}: Props) {
  const { main, decimal } = splitMoneyHero(amount, locale);
  const decimalSeparator = locale === 'ar' ? '٫' : '.';

  return (
    <div className={cn('payment-amount-hero', `payment-amount-hero--${size}`, className)}>
      <div className="payment-amount-hero-value" dir="ltr">
        <span className="payment-amount-hero-main tabular-nums">{main}</span>
        <span className="payment-amount-hero-dec tabular-nums">
          {decimalSeparator}
          {decimal}
        </span>
      </div>
      {currencyLabel ? <p className="payment-amount-hero-currency">{currencyLabel}</p> : null}
    </div>
  );
}
