import { useCallback, useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

type FullscreenToggleProps = {
  className?: string;
};

export function FullscreenToggle({ className }: FullscreenToggleProps) {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* المتصفح قد يمنع ملء الشاشة */
    }
  }, []);

  const label = isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter');

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600',
        className,
      )}
      aria-label={label}
      title={label}
    >
      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );
}
