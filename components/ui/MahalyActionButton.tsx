import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MahalyActionButtonProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  icon?: LucideIcon;
};

/** Unified primary action button — same visual as ErpAddButton / reference image 3. */
export function MahalyActionButton({
  children,
  className,
  onClick,
  disabled,
  type = 'button',
  icon: Icon = Plus,
}: MahalyActionButtonProps) {
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
