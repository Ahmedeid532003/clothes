import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type ErpAddButtonProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
};

export function ErpAddButton({
  children,
  className,
  onClick,
  disabled,
  type = 'button',
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
          <Plus className="h-4 w-4" strokeWidth={3} />
        </span>
        <span className="hr-structure-add-btn-label">{children}</span>
      </span>
    </button>
  );
}
