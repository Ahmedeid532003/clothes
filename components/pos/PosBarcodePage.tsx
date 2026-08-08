import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Store } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { setStoredBranchId } from '@/lib/auth/branchStorage';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { PosBarcodeStudioApp } from './barcode-studio/PosBarcodeStudioApp';

type Props = {
  onClose: () => void;
};

export function PosBarcodePage({ onClose }: Props) {
  const { t, isRtl } = useLanguage();
  const { activeBranchId, branches, setActiveBranchId } = useAuth();

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  useEffect(() => {
    if (activeBranchId) setStoredBranchId(activeBranchId);
  }, [activeBranchId]);

  if (!activeBranchId || !activeBranch) {
    return createPortal(
      <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-100 p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Store className="mx-auto mb-3 h-10 w-10 text-amber-600" />
          <p className="font-bold">{t('pos.selectBranch')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {branches.map((b) => (
              <Button key={b.id} onClick={() => setActiveBranchId(b.id)}>
                {b.name_ar}
              </Button>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-[220] overflow-auto bg-slate-100">
      <PosBarcodeStudioApp activeBranchId={activeBranchId} onClose={onClose} />
    </div>,
    document.body,
  );
}
