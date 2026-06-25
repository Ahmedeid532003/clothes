import { PurchaseInvoiceWorkspace, type PurchaseInvoiceWorkspaceProps } from './PurchaseInvoiceWorkspace';

export type { InvoiceLineDraft } from './types';

export function PurchaseInvoiceForm(props: PurchaseInvoiceWorkspaceProps) {
  return <PurchaseInvoiceWorkspace {...props} />;
}
