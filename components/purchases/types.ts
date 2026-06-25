export type DiscountType = 'percent' | 'amount';

export type InvoiceLineDraft = {
  key: string;
  variant?: string;
  product?: string;
  size?: string;
  color?: string;
  label: string;
  product_code?: string;
  name_ar?: string;
  description?: string;
  brand_name?: string;
  season_name?: string;
  season_id?: string;
  quantity: string;
  unit_cost: string;
  discount_type: DiscountType;
  discount_percent: string;
  discount_amount: string;
  tax_percent: string;
  markup_percent: string;
  warehouse_qty?: string;
  total_stock_qty?: string;
  sale_price?: string;
  purchase_count?: number;
};
