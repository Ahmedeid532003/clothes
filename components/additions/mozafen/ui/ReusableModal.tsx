import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ReusableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  lang?: 'en' | 'ar';
}

export const ReusableModal: React.FC<ReusableModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  size = 'md',
  lang = 'ar'
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-[95vw] h-[90vh]'
  };

  const headerHeight = description ? '66px' : '56px';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          {/* Backdrop click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-transparent cursor-pointer"
          />

          {/* Modal Content container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
            className={cn(
              "relative bg-white w-full rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[92vh] z-10",
              sizeClasses[size]
            )}
          >
            {/* Modal Header */}
            <div 
              style={{ height: headerHeight }}
              className={cn(
              "px-5 border-b border-orange-600 bg-orange-500 text-white flex justify-between items-center shrink-0",
              lang === 'ar' ? 'flex-row-reverse' : 'flex-row'
            )}>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-600/30 text-white flex items-center justify-center font-bold shrink-0">
                  {icon || <Layers size={18} className="text-white" />}
                </span>
                <div>
                  <h3 className="text-sm font-black text-white tracking-tight leading-tight">{title}</h3>
                  {description && (
                    <p className="text-[10px] text-white/80 font-bold leading-tight mt-0.5">{description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 text-slate-705">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
