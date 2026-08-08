import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type ErpAddButtonProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  icon?: LucideIcon;
};

/** Primary action button — exact match to reference (blue pill + white circle icon). */
export function ErpAddButton({
  children,
  className,
  onClick,
  disabled,
  type = 'button',
  icon: Icon = Plus,
}: ErpAddButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn('mahaly-action-btn erp-add-action', className)}
    >
      <span className="mahaly-action-btn-icon" aria-hidden>
        <Icon strokeWidth={2.75} />
      </span>
      <span className="mahaly-action-btn-label">{children}</span>
    </button>
  );
}
