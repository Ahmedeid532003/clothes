import type { KeyboardEventHandler } from 'react';
import { Input } from '@/components/ui/input';
import { normalizeMoneyAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

export function MoneyAmountInput({ value, onChange, className, placeholder, id, onKeyDown }: Props) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(normalizeMoneyAmount(e.target.value))}
      onKeyDown={onKeyDown}
      className={cn('money-amount-input', className)}
    />
  );
}
