/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  /** Inventory variant id for POS sale lines */
  variantId?: string;
  /** Parent product id in ERP */
  productDbId?: string;
  code: string;
  barcode: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  image: string;
  description: string;
  rating: number;
  specifications?: Record<string, string>;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // Discount amount in currency (e.g. EGP)
  sellerName: string;
  itemBalance: number; // Stock balance before adding
}

export interface Installment {
  id: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  paidDate?: string;
}

export interface Customer {
  id?: string;
  code: string;
  name: string;
  balance: number;
  notes: string;
  group: string; // e.g. "عادي A", "مميز VIP"
  phone: string;
  spouseName?: string;
  guarantors?: string[];
  status: 'Active' | 'Inactive' | 'Restricted';
  installments: Installment[];
}

/** Document loaded into POS cart (scan order, quotation, reservation, held) */
export type PosLoadDocument = {
  id: string;
  customerName: string;
  date: string;
  items: Array<{ productId: string; qty: number }>;
  total: number;
  notes?: string;
  deposit?: number;
  remaining?: number;
};

export interface Transaction {
  id: string; // Invoice number e.g. INV-2026-0001
  date: string;
  type: 'sale' | 'return' | 'exchange' | 'reservation' | 'quotation';
  customerName: string;
  customerCode?: string;
  items: CartItem[];
  returnedItems?: CartItem[]; // For exchange
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'wallet' | 'split';
  splitDetails?: {
    cash: number;
    card: number;
    wallet: number;
  };
  notes?: string;
  sellerId?: string;
}
