/** أنواع ومجموعات ثابتة — تُعرض حتى لو فشل تحميل الـ API */
export type KindOption = { key: string; labelAr: string; labelEn: string; hintAr: string; hintEn: string };

export const ENTITY_KIND_OPTIONS: KindOption[] = [
  {
    key: 'establishment',
    labelAr: 'منشأة / مصنع',
    labelEn: 'Establishment / Factory',
    hintAr: 'مورد مصنع أو منشأة إنتاج',
    hintEn: 'Factory or production supplier',
  },
  {
    key: 'office',
    labelAr: 'مكتب',
    labelEn: 'Office / Trader',
    hintAr: 'مكتب توريد أو وسيط',
    hintEn: 'Trading office or broker',
  },
  {
    key: 'establishment_office',
    labelAr: 'منشأة ومكتب',
    labelEn: 'Establishment & Office',
    hintAr: 'يجمع الإنتاج والتوريد',
    hintEn: 'Production and supply combined',
  },
  {
    key: 'shop',
    labelAr: 'محل',
    labelEn: 'Shop',
    hintAr: 'مورد محل تجزئة',
    hintEn: 'Retail shop supplier',
  },
  {
    key: 'pos_point',
    labelAr: 'نقطة بيع',
    labelEn: 'POS point',
    hintAr: 'شريك بيع خارجي (ليس فروع نظامك)',
    hintEn: 'External sales point (not your branches)',
  },
];

export const SETTLEMENT_MODE_OPTIONS: KindOption[] = [
  {
    key: 'consignment',
    labelAr: 'أمانات',
    labelEn: 'Consignment',
    hintAr: 'بضاعة أمانات — تُسجّل مبيعات بتكلفة المورد',
    hintEn: 'Consignment stock — sales at supplier cost',
  },
  {
    key: 'cash',
    labelAr: 'نقدي',
    labelEn: 'Cash',
    hintAr: 'شراء نقدي — دفع فوري',
    hintEn: 'Cash purchase — immediate payment',
  },
  {
    key: 'credit_returns',
    labelAr: 'أجل ومرتجعات بمواعيد',
    labelEn: 'Credit + scheduled returns',
    hintAr: 'آجل مع جدول مرتجعات متفق عليه',
    hintEn: 'Credit with agreed return schedule',
  },
  {
    key: 'credit_no_returns',
    labelAr: 'أجل بدون مرتجعات',
    labelEn: 'Credit, no returns',
    hintAr: 'آجل بدون سياسة مرتجعات',
    hintEn: 'Credit without returns policy',
  },
];

export function kindLabel(opt: KindOption, locale: 'ar' | 'en') {
  return locale === 'ar' ? opt.labelAr : opt.labelEn;
}

export function kindHint(opt: KindOption, locale: 'ar' | 'en') {
  return locale === 'ar' ? opt.hintAr : opt.hintEn;
}
