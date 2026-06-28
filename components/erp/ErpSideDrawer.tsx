import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetTitle } from '@/components/ui/sheet';
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
  half: 'erp-form-modal--half',
  wide: 'erp-form-modal--wide',
  full: 'erp-form-modal--full',
};

/** Centered professional form modal (replaces legacy side drawer). */
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
        side="center"
        showCloseButton={false}
        className={cn(
          'erp-form-modal erp-side-drawer w-full gap-0 border-0 p-0',
          widthClass[width],
          steps && steps.length > 1 && 'erp-form-modal--with-stepper',
          className,
        )}
      >
        <header className="erp-form-modal-header">
          <button
            type="button"
            className="erp-form-modal-close"
            onClick={() => onOpenChange(false)}
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="erp-form-modal-header-main">
            <span className="erp-form-modal-icon" aria-hidden>
              <Plus className="h-5 w-5" strokeWidth={2.75} />
            </span>
            <div className="erp-form-modal-heading">
              <SheetTitle className="erp-form-modal-title">{title}</SheetTitle>
              {description ? <p className="erp-form-modal-subtitle">{description}</p> : null}
            </div>
          </div>
        </header>

        {steps && steps.length > 1 ? (
          <div className="erp-form-modal-stepper" aria-label="Form steps">
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

        <div className="erp-form-modal-body erp-side-drawer-body premium-form-workspace">
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

        <SheetFooter className="erp-form-modal-footer erp-side-drawer-footer form-actions">
          <Button variant="outline" className="erp-form-modal-btn-cancel btn-premium-secondary" onClick={() => onOpenChange(false)}>
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
          <Button className="erp-form-modal-btn-save btn-premium" onClick={onSave} disabled={disabled}>
            {saveLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export { ErpSideDrawer as ErpFormModal };
