
import React, { useState } from 'react';
import { QUICK_ACTIONS } from '@/constants';
import { QuickActionCard } from './QuickActionCard';
import { LayoutGrid, Plus, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';

export const DashboardHome: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const displayName = user?.username || user?.full_name?.trim() || '';
  const [userRole] = useState<'admin' | 'sales' | 'inventory'>('admin');
  const [favorites, setFavorites] = useState<string[]>(['pos', 'purchase-invoice', 'customer-coding']);
  const [isEditMode, setIsEditMode] = useState(false);

  const availableActions = QUICK_ACTIONS.filter(action => 
    action.requiredPermission.includes(userRole as any) || action.requiredPermission.includes('admin')
  );

  const favoriteActionObjects = availableActions.filter(action => favorites.includes(action.id));
  const suggestedActions = availableActions.filter(action => !favorites.includes(action.id));

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 px-4 md:px-0">
      <div className="pt-0 pb-2 flex flex-col justify-center transition-all">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600">{t('home.title')}</h1>
        <p className="text-slate-500 mt-1">
          {t('home.welcome')}{' '}
          <span className="font-extrabold text-slate-900 text-base md:text-lg">{displayName}</span>
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <LayoutGrid size={20} className="text-blue-500" />
              {t('home.quickAccess')}
            </h2>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-semibold",
                isEditMode 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              <span>{t('home.smartLink')}</span>
              <Settings2 size={18} className={cn(isEditMode && "animate-spin-slow")} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:mt-10 transition-all">
            <AnimatePresence mode="popLayout">
              {favoriteActionObjects.map((action) => (
                <motion.div
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  key={action.id}
                >
                  <QuickActionCard 
                    action={action} 
                    onRemove={isEditMode ? () => toggleFavorite(action.id) : undefined}
                  />
                </motion.div>
              ))}
              
              {isEditMode && suggestedActions.map((action) => (
                <motion.div
                  initial={{ opacity: 0, borderStyle: 'dashed' }}
                  animate={{ opacity: 0.6 }}
                  key={action.id}
                  onClick={() => toggleFavorite(action.id)}
                  className="group relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-300 transition-all cursor-pointer aspect-square w-full"
                >
                  <div className="p-2 rounded-lg bg-slate-200 text-slate-400">
                    <Plus size={20} />
                  </div>
                  <h3 className="mt-2 text-xs font-semibold text-slate-400">{t(action.titleKey)}</h3>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {!isEditMode && favoriteActionObjects.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                <Plus size={24} className="mb-2" />
                <p className="text-sm font-medium">{t('home.noFavorites')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
