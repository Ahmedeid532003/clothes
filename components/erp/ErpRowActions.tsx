import type { ReactNode } from 'react';
import { Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type Props = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: ReactNode;
};

export function ErpRowActions({ onView, onEdit, onDelete, extra }: Props) {
  const { t, isRtl } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            className="erp-row-actions-trigger rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
            aria-label={t('erpTable.actions')}
          />
        }
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={isRtl ? 'left' : 'right'} className="erp-row-actions-menu min-w-40">
        {onView ? (
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4" />
            {t('erpTable.view')}
          </DropdownMenuItem>
        ) : null}
        {onEdit ? (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            {t('erpTable.edit')}
          </DropdownMenuItem>
        ) : null}
        {extra}
        {onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2 className="h-4 w-4" />
              {t('erpTable.delete')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
