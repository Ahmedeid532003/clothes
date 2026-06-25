import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Snowflake, Phone, CreditCard, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { TENANT_FROZEN_EVENT } from '@/lib/api/errors';
import { clearAuthTokens } from '@/lib/api/client';

type FrozenDetail = { message?: string };

function FrozenDialogContent({
  message,
  onClose,
  isRtl,
  t,
}: {
  message: string;
  onClose: () => void;
  isRtl: boolean;
  t: (key: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/50 overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 end-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X size={18} />
      </button>

      <div className="px-8 pt-10 pb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300">
          <Snowflake size={32} strokeWidth={1.75} />
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          {t('auth.frozenTitle')}
        </h2>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {message || t('auth.frozenDefaultMessage')}
        </p>

        <div className="space-y-3 text-start mb-8">
          <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <CreditCard className="shrink-0 text-emerald-400 mt-0.5" size={18} />
            <p className="text-sm text-slate-300">{t('auth.frozenPayHint')}</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <Phone className="shrink-0 text-blue-400 mt-0.5" size={18} />
            <p className="text-sm text-slate-300">{t('auth.frozenSupportHint')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 transition-colors shadow-lg shadow-blue-900/40"
        >
          {t('auth.frozenClose')}
        </button>
      </div>
    </motion.div>
  );
}

export function AccountFrozenModalHost() {
  const { t, isRtl } = useLanguage();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onFrozen = (e: Event) => {
      const detail = (e as CustomEvent<FrozenDetail>).detail;
      setMessage(detail?.message || t('auth.frozenDefaultMessage'));
      clearAuthTokens();
      window.dispatchEvent(new Event('auth:logout'));
      setOpen(true);
    };
    window.addEventListener(TENANT_FROZEN_EVENT, onFrozen);
    return () => window.removeEventListener(TENANT_FROZEN_EVENT, onFrozen);
  }, [t]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            aria-label={t('auth.frozenClose')}
            onClick={close}
          />
          <FrozenDialogContent
            message={message}
            onClose={close}
            isRtl={isRtl}
            t={t}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AccountFrozenModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  const { t, isRtl } = useLanguage();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-label={t('auth.frozenClose')}
          />
          <FrozenDialogContent message={message} onClose={onClose} isRtl={isRtl} t={t} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
