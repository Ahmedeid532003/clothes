import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Sparkles, X } from 'lucide-react';

export function HrStructureModal({
  open,
  title,
  subtitle,
  mode = 'add',
  onClose,
  onSave,
  saveLabel,
  cancelLabel,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  mode?: 'add' | 'edit';
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  cancelLabel: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="hr-structure-modal-overlay"
          className="hr-structure-modal-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="hr-structure-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hr-structure-modal-title"
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hr-structure-modal-accent" aria-hidden />
            <header className="hr-structure-modal-header">
              <button
                type="button"
                className="hr-structure-modal-close"
                onClick={onClose}
                aria-label="close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="hr-structure-modal-hero">
                <span className={`hr-structure-modal-icon ${mode === 'add' ? 'is-add' : 'is-edit'}`}>
                  {mode === 'add' ? <Plus className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </span>
                <div className="hr-structure-modal-title-row">
                  <h2 id="hr-structure-modal-title">{title}</h2>
                  {subtitle ? <p className="hr-structure-modal-subtitle">{subtitle}</p> : null}
                </div>
              </div>
            </header>
            <div className="hr-structure-modal-body">{children}</div>
            <footer className="hr-structure-modal-footer">
              <button type="button" className="hr-structure-modal-save" onClick={onSave}>
                {saveLabel}
              </button>
              <button type="button" className="hr-structure-modal-cancel" onClick={onClose}>
                {cancelLabel}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function HrStructureField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="hr-structure-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
