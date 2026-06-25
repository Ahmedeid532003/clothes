
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { QuickAction } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface QuickActionCardProps {
  action: QuickAction;
  onRemove?: () => void;
  isDraggable?: boolean;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({ action, onRemove }) => {
  const { t } = useLanguage();
  const Icon = (LucideIcons as any)[action.icon] || LucideIcons.HelpCircle;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative flex flex-col items-center justify-center p-6 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden aspect-square w-full"
    >
      <div className={cn(
        "mb-4 p-3 rounded-lg text-white transition-transform group-hover:scale-110",
        action.color
      )}>
        <Icon size={24} />
      </div>
      <h3 className="text-sm font-semibold text-slate-800 text-center">{t(action.titleKey)}</h3>
      <p className="mt-1 text-[11px] text-slate-500 text-center leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
        {t(action.descriptionKey)}
      </p>
      
      {onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 end-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <LucideIcons.X size={14} />
        </button>
      )}
    </motion.div>
  );
};
