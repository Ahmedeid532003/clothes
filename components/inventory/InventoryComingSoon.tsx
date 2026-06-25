import { Construction } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type Props = {
  navKey: string;
  descriptionKey?: string;
};

export function InventoryComingSoon({ navKey, descriptionKey }: Props) {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <Construction className="mx-auto mb-4 h-12 w-12 text-amber-500" />
      <h1 className="text-xl font-bold text-slate-900">{t(`nav.${navKey}`)}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {descriptionKey ? t(descriptionKey) : t('inventory.comingSoon')}
      </p>
    </div>
  );
}
