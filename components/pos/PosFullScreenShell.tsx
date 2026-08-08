import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Maximize2, Minimize2, Store } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

type Props = {
  title: string;
  branchName?: string;
  warehouseName?: string;
  onClose: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
};

export function PosFullScreenShell({
  title,
  branchName,
  warehouseName,
  onClose,
  fullscreen,
  onToggleFullscreen,
  headerExtra,
  children,
}: Props) {
  const { t, isRtl } = useLanguage();

  const content = (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="pos-premium-shell fixed inset-0 z-[220] flex h-[100dvh] flex-col overflow-hidden"
      data-pos-fullscreen
    >
      <header className="pos-premium-header flex shrink-0 items-center gap-3">
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black text-white">{title}</h1>
          {branchName ? (
            <p className="flex items-center gap-1.5 truncate text-[11px] text-white/72">
              <Store className="h-3.5 w-3.5 shrink-0 text-sky-200" />
              {branchName}
              {warehouseName ? ` · ${warehouseName}` : ''}
            </p>
          ) : null}
        </div>
        {headerExtra}
        {onToggleFullscreen ? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={onToggleFullscreen}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {fullscreen ? t('pos.exitFullscreen') : t('pos.fullscreen')}
          </Button>
        ) : null}
      </header>
      <div className="pos-premium-body">{children}</div>
    </div>
  );

  return createPortal(content, document.body);
}
