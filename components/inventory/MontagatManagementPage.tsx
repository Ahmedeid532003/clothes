import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { MontagatApp } from './montagat/MontagatApp';

type Props = {
  onClose: () => void;
};

export function MontagatManagementPage({ onClose }: Props) {
  const { isRtl } = useLanguage();

  return createPortal(
    <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-[220] overflow-auto bg-gray-50">
      <MontagatApp onClose={onClose} />
    </div>,
    document.body,
  );
}
