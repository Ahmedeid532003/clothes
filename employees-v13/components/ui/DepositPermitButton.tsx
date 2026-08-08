import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DepositPermitButtonProps {
  onClick?: () => void;
  lang?: 'en' | 'ar';
  variant?: 'outline' | 'solid';
  className?: string;
}

export const DepositPermitButton: React.FC<DepositPermitButtonProps> = ({
  onClick,
  lang = 'en',
  variant = 'outline',
  className
}) => {
  return (
    <button
      onClick={onClick}
      id="deposit-permit-btn"
      className={cn(
        variant === 'outline'
          ? "px-3.5 py-2.5 rounded-lg text-xs font-black bg-[#0a1945]/10 text-[#0a1945] hover:bg-[#0a1945] hover:text-white border border-blue-900/10 active:scale-95 cursor-pointer shadow-xs transition duration-150 flex items-center gap-1.5"
          : "mt-3.5 w-full bg-[#0a1945] hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-xs transition duration-150",
        className
      )}
    >
      <Plus 
        size={variant === 'outline' ? 14 : 14} 
        className={cn(
          variant === 'outline' ? "text-orange-500 hover:text-white" : "w-3.5 h-3.5 text-orange-400"
        )} 
      />
      <span>{lang === 'ar' ? 'إذن إيداع بالبنك' : 'Bank Deposit Permit'}</span>
    </button>
  );
};
