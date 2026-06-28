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
      className={cn('hr-structure-add-btn', className)}
    >
      <span className="hr-structure-add-btn-aura" aria-hidden />
      <span className="hr-structure-add-btn-shine" aria-hidden />
      <span className="hr-structure-add-btn-core">
        <span className="hr-structure-add-btn-icon">
          <Icon className="h-4 w-4" strokeWidth={3} />
        </span>
        <span className="hr-structure-add-btn-label">{children}</span>
      </span>
    </button>
  );
}
