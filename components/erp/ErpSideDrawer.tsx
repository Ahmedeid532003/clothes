import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSave: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
  width?: 'half' | 'wide' | 'full';
  className?: string;
  steps?: string[];
  currentStep?: number;
  validationErrors?: string[];
};

const widthClass = {
  half: 'sm:w-[40vw] sm:max-w-[40vw]',
  wide: 'sm:w-[65vw] sm:max-w-[65vw]',
  full: 'sm:max-w-[100vw] erp-side-drawer-full',
};

export function ErpSideDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSave,
  saveLabel = 'إضافة',
  cancelLabel = 'Cancel',
  disabled = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  width = 'wide',
  className = '',
  steps,
  currentStep = 0,
  validationErrors = [],
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton={false}
        className={cn(
          'erp-side-drawer w-full border-s-0 p-0',
          widthClass[width],
          steps && steps.length > 1 && 'erp-side-drawer--with-stepper',
          className,
        )}
      >
        <SheetHeader className="erp-side-drawer-header">
          <button type="button" className="erp-side-drawer-close" onClick={() => onOpenChange(false)} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
          <div>
            <SheetTitle className="text-white">{title}</SheetTitle>
            {description ? <p>{description}</p> : null}
          </div>
        </SheetHeader>
        {steps && steps.length > 1 ? (
          <div className="erp-side-drawer-stepper-dock" aria-label="Form steps">
            <div className="premium-form-stepper">
              {steps.map((step, index) => (
                <div
                  key={`${step}-${index}`}
                  className="premium-form-step"
                  data-active={index === currentStep ? 'true' : undefined}
                  data-complete={index < currentStep ? 'true' : undefined}
                >
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="erp-side-drawer-body premium-form-workspace">
          {validationErrors.length > 0 ? (
            <div className="premium-validation-summary" role="alert" aria-live="polite">
              <strong>راجع البيانات قبل الحفظ</strong>
              <ul>
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="premium-form-surface">{children}</div>
        </div>
        <SheetFooter className="erp-side-drawer-footer form-actions">
          <Button variant="outline" className="btn-premium-secondary" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          {secondaryLabel && onSecondary ? (
            <Button
              type="button"
              variant="outline"
              className="btn-premium-draft"
              onClick={onSecondary}
              disabled={secondaryDisabled}
            >
              {secondaryLabel}
            </Button>
          ) : null}
          <Button className="btn-premium" onClick={onSave} disabled={disabled}>
            {saveLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
