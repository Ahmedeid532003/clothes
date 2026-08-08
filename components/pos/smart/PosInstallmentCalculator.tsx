import React, { useMemo } from 'react';
import { Calculator, CheckCircle2, Calendar } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fmtPosAmount } from '../pos-utils';

export type InstallmentCalcState = {
  invoiceTotal: number;
  downPayment: number;
  months: number;
  interestRate: number;
};

type Props = {
  value: InstallmentCalcState;
  onChange: (patch: Partial<InstallmentCalcState>) => void;
  customerName?: string;
  onApprove?: () => void;
  approving?: boolean;
};

function addMonths(base: Date, n: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

function fmtDate(d: Date, locale: string) {
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB');
}

export function PosInstallmentCalculator({
  value,
  onChange,
  customerName,
  onApprove,
  approving,
}: Props) {
  const { t, locale } = useLanguage();
  const currency = t('dashboard.currency');

  const calc = useMemo(() => {
    const remaining = Math.max(value.invoiceTotal - value.downPayment, 0);
    const interest = remaining * (value.interestRate / 100) * value.months;
    const totalDebt = remaining + interest;
    const monthly = value.months > 0 ? totalDebt / value.months : 0;
    const start = new Date();
    const schedule = Array.from({ length: value.months }, (_, i) => ({
      n: i + 1,
      date: addMonths(start, i + 1),
      amount: monthly,
    }));
    return { remaining, interest, totalDebt, monthly, schedule };
  }, [value]);

  const sliders: Array<{
    key: keyof InstallmentCalcState;
    label: string;
    color: 'green' | 'blue' | 'purple' | 'red';
    min: number;
    max: number;
    step: number;
    minLabel: string;
    maxLabel: string;
    format: (v: number) => string;
  }> = [
    {
      key: 'invoiceTotal',
      label: t('pos.smart.accounts.calcInvoice'),
      color: 'green',
      min: 500,
      max: 50000,
      step: 100,
      minLabel: `500 ${currency}`,
      maxLabel: `50,000 ${currency}`,
      format: (v) => `${fmtPosAmount(v)} ${currency}`,
    },
    {
      key: 'downPayment',
      label: t('pos.smart.accounts.calcDown'),
      color: 'blue',
      min: 0,
      max: value.invoiceTotal,
      step: 50,
      minLabel: `0 ${currency}`,
      maxLabel: `${fmtPosAmount(value.invoiceTotal)} ${currency}`,
      format: (v) => `${fmtPosAmount(v)} ${currency}`,
    },
    {
      key: 'months',
      label: t('pos.smart.accounts.calcMonths'),
      color: 'purple',
      min: 1,
      max: 24,
      step: 1,
      minLabel: t('pos.smart.accounts.oneMonth'),
      maxLabel: t('pos.smart.accounts.months24'),
      format: (v) => `${v} ${t('pos.smart.accounts.monthsUnit')}`,
    },
    {
      key: 'interestRate',
      label: t('pos.smart.accounts.calcInterest'),
      color: 'red',
      min: 0,
      max: 10,
      step: 0.5,
      minLabel: t('pos.smart.accounts.noInterest'),
      maxLabel: t('pos.smart.accounts.interest10'),
      format: (v) => `${v}%`,
    },
  ];

  return (
    <aside className="psc-acc-calc">
      <header className="psc-acc-calc-head">
        <div className="psc-acc-calc-icon" aria-hidden>
          <Calculator className="h-5 w-5" />
        </div>
        <div className="psc-acc-calc-head-text">
          <h3>{t('pos.smart.accounts.calcTitle')}</h3>
          <p>{t('pos.smart.accounts.calcSub')}</p>
        </div>
      </header>

      <div className="psc-acc-calc-sliders">
        {sliders.map((s) => (
          <div key={s.key} className="psc-acc-slider-block">
            <div className="psc-acc-slider-top">
              <span className="psc-acc-slider-label">{s.label}</span>
              <span className={`psc-acc-slider-val psc-acc-slider-val--${s.color}`}>
                {s.format(value[s.key])}
              </span>
            </div>
            <input
              type="range"
              className={`psc-acc-slider psc-acc-slider--${s.color}`}
              min={s.min}
              max={s.max}
              step={s.step}
              value={value[s.key]}
              aria-label={s.label}
              onChange={(e) => onChange({ [s.key]: parseFloat(e.target.value) })}
            />
            <div className="psc-acc-slider-scale">
              <span>{s.minLabel}</span>
              <span>{s.maxLabel}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="psc-acc-calc-summary">
        <div className="psc-acc-calc-line">
          <span>{t('pos.smart.accounts.remainingSchedule')}</span>
          <strong>{fmtPosAmount(calc.remaining)} {currency}</strong>
        </div>
        <div className="psc-acc-calc-line">
          <span>{t('pos.smart.accounts.totalInterest', { months: String(value.months) })}</span>
          <strong className="psc-acc-calc-interest">+{fmtPosAmount(calc.interest)} {currency}</strong>
        </div>
        <div className="psc-acc-calc-line psc-acc-calc-line--total">
          <span>{t('pos.smart.accounts.totalDebt')}</span>
          <strong>{fmtPosAmount(calc.totalDebt)} {currency}</strong>
        </div>

        <div className="psc-acc-monthly-card">
          <p>{t('pos.smart.accounts.fixedMonthly')}</p>
          <div className="psc-acc-monthly-val">
            {fmtPosAmount(calc.monthly)} <small>{currency} / {t('pos.smart.accounts.perMonth')}</small>
          </div>
          <span className="psc-acc-monthly-sub">
            {t('pos.smart.accounts.forMonths', { n: String(value.months) })}
          </span>
        </div>
      </div>

      {onApprove ? (
        <button
          type="button"
          className="psc-acc-approve-btn"
          disabled={!customerName || approving}
          onClick={onApprove}
        >
          <CheckCircle2 className="h-4 w-4" />
          {customerName
            ? t('pos.smart.accounts.approveFor', { name: customerName })
            : t('pos.smart.accounts.approvePlan')}
        </button>
      ) : (
        <button type="button" className="psc-acc-start-btn" disabled>
          {t('pos.smart.accounts.startAuto')}
        </button>
      )}

      {calc.schedule.length > 0 ? (
        <div className="psc-acc-schedule">
          <h4>{t('pos.smart.accounts.schedulePreview')}</h4>
          <div className="psc-acc-schedule-list">
            {calc.schedule.map((row) => (
              <div key={row.n} className="psc-acc-schedule-row">
                <span className="psc-acc-schedule-n">
                  {t('pos.smart.accounts.installmentN', { n: String(row.n), total: String(value.months) })}
                </span>
                <span className="psc-acc-schedule-date">
                  <Calendar className="h-3.5 w-3.5" />
                  {fmtDate(row.date, locale)}
                </span>
                <strong className="psc-acc-schedule-amt">
                  {fmtPosAmount(row.amount)} {currency}
                </strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
