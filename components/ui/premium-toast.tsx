import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

type PremiumToast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastDetail = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

declare global {
  interface WindowEventMap {
    'mahaly:toast': CustomEvent<ToastDetail>;
  }
}

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export function showPremiumToast(detail: ToastDetail) {
  window.dispatchEvent(new CustomEvent('mahaly:toast', { detail }));
}

export function PremiumToastHost() {
  const [toasts, setToasts] = useState<PremiumToast[]>([]);

  useEffect(() => {
    const onToast = (event: WindowEventMap['mahaly:toast']) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast: PremiumToast = {
        id,
        title: event.detail.title,
        description: event.detail.description,
        tone: event.detail.tone ?? 'info',
      };
      setToasts((current) => [toast, ...current].slice(0, 4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, 4200);
    };

    window.addEventListener('mahaly:toast', onToast);
    return () => window.removeEventListener('mahaly:toast', onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="premium-toast-viewport" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.tone];
        return (
          <div key={toast.id} className={cn('premium-toast', `premium-toast-${toast.tone}`)} role="status">
            <span className="premium-toast-icon">
              <Icon className="h-4 w-4" />
            </span>
            <div className="premium-toast-copy">
              <strong>{toast.title}</strong>
              {toast.description ? <p>{toast.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
