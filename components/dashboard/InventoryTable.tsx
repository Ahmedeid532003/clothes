
import React, { useState } from 'react';
import { MOCK_INVENTORY } from '@/constants';
import { cn } from '@/lib/utils';
import { AlertCircle, Clock, Package } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export const InventoryTable: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'reorder' | 'stagnant'>('reorder');

  const filteredItems = MOCK_INVENTORY.filter(item => item.status === activeTab);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Package className="text-slate-400" size={18} />
          {t('inventory.title')}
        </h2>
        <div className="flex bg-slate-200/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('reorder')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
              activeTab === 'reorder' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <AlertCircle size={14} />
            {t('inventory.reorderNeeded')}
          </button>
          <button
            onClick={() => setActiveTab('stagnant')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
              activeTab === 'stagnant' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Clock size={14} />
            {t('inventory.stagnantItems')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-500 uppercase tracking-wider">{t('inventory.itemCode')}</th>
              <th className="px-6 py-3 font-semibold text-slate-500 uppercase tracking-wider">{t('inventory.productName')}</th>
              <th className="px-6 py-3 font-semibold text-slate-500 uppercase tracking-wider text-end">{t('inventory.stock')}</th>
              <th className="px-6 py-3 font-semibold text-slate-500 uppercase tracking-wider text-end">
                {activeTab === 'reorder' ? t('inventory.minStock') : t('inventory.lastSold')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-mono text-slate-400">{item.code}</td>
                <td className="px-6 py-4 font-medium text-slate-700">{item.name}</td>
                <td className="px-6 py-4 text-end">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full font-bold",
                    item.stock <= item.minStock ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50"
                  )}>
                    {item.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-end text-slate-500 font-medium">
                  {activeTab === 'reorder' ? item.minStock : item.lastSold}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Package size={32} className="mb-2 opacity-20" />
            <p>{t('inventory.noItems')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
