/** تعريف الحقول الذكية — مصدر الحقيقة للفورم (متزامن مع Backend). */

export type SmartFieldType =
  | 'text'
  | 'tel'
  | 'email'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'file'
  | 'readonly'
  | 'gps'
  | 'rating'
  | 'date';

export type SmartFieldDef = {
  key: string;
  type: SmartFieldType;
  label_ar: string;
  label_en: string;
  section: string;
  /** لا يظهر في نموذج المحل */
  individual_only?: boolean;
  /** لا يظهر في نموذج الفرد */
  shop_only?: boolean;
  options?: { value: string; label_ar: string; label_en?: string }[];
  placeholder_ar?: string;
  col_span?: 1 | 2;
};

/** حقول تُخفى تلقائياً عند نوع «محل» */
export const HIDDEN_FOR_SHOP = new Set([
  'national_id',
  'card_number',
  'full_name_quad',
  'gender',
  'birth_date',
  'marital_status',
  'job_title',
  'employer',
  'children_count',
  'salary',
  'income_source',
  'installment_plan',
  'interest_rate',
  'guarantor_name',
  'spouse_name',
  'phone_verified',
  'id_photo_front',
  'id_photo_back',
  'utility_receipt',
  'contract_file',
  'extra_phone',
  'social_status',
]);

export const SMART_FIELD_CATALOG: SmartFieldDef[] = [
  // ——— محل ———
  { key: 'shop_name', type: 'text', label_ar: 'اسم المحل', label_en: 'Shop name', section: 'shop', shop_only: true, col_span: 2 },
  { key: 'customer_code_preview', type: 'readonly', label_ar: 'كود العميل', label_en: 'Customer code', section: 'shop', shop_only: true },
  { key: 'owner_name', type: 'text', label_ar: 'اسم مالك المحل', label_en: 'Owner name', section: 'shop', shop_only: true },
  { key: 'owner_phone', type: 'tel', label_ar: 'هاتف مالك المحل', label_en: 'Owner phone', section: 'shop', shop_only: true },
  { key: 'responsible_name', type: 'text', label_ar: 'اسم المسئول', label_en: 'Responsible person', section: 'shop', shop_only: true },
  { key: 'responsible_phone', type: 'tel', label_ar: 'هاتف المسئول', label_en: 'Responsible phone', section: 'shop', shop_only: true },
  { key: 'whatsapp', type: 'tel', label_ar: 'واتساب', label_en: 'WhatsApp', section: 'contact' },
  { key: 'governorate', type: 'text', label_ar: 'المحافظة', label_en: 'Governorate', section: 'address' },
  { key: 'city', type: 'text', label_ar: 'المدينة', label_en: 'City', section: 'address' },
  { key: 'district', type: 'text', label_ar: 'المنطقة', label_en: 'District', section: 'address' },
  { key: 'address_detail', type: 'textarea', label_ar: 'العنوان بالتفصيل', label_en: 'Detailed address', section: 'address', col_span: 2 },
  { key: 'gps_location', type: 'gps', label_ar: 'اللوكيشن GPS', label_en: 'GPS location', section: 'address', col_span: 2 },
  { key: 'shop_photo', type: 'file', label_ar: 'صورة المحل', label_en: 'Shop photo', section: 'files', shop_only: true },
  { key: 'commercial_register_file', type: 'file', label_ar: 'السجل التجاري', label_en: 'Commercial register', section: 'files', shop_only: true },
  { key: 'tax_card_file', type: 'file', label_ar: 'البطاقة الضريبية', label_en: 'Tax card', section: 'files', shop_only: true },
  { key: 'extra_attachments', type: 'file', label_ar: 'ملفات مرفقة', label_en: 'Attachments', section: 'files', col_span: 2 },
  { key: 'route_line', type: 'text', label_ar: 'خط السير', label_en: 'Route', section: 'ops', shop_only: true },
  { key: 'customer_rating', type: 'rating', label_ar: 'تقييم العميل', label_en: 'Rating', section: 'ops' },
  { key: 'uses_consignment', type: 'checkbox', label_ar: 'يعمل بالأمانات؟', label_en: 'Consignment?', section: 'flags', shop_only: true },
  { key: 'is_stopped', type: 'checkbox', label_ar: 'عميل متوقف؟', label_en: 'Stopped?', section: 'flags' },
  { key: 'stop_reason', type: 'textarea', label_ar: 'سبب الإيقاف', label_en: 'Stop reason', section: 'flags', col_span: 2 },
  { key: 'last_deal_date', type: 'readonly', label_ar: 'تاريخ آخر تعامل', label_en: 'Last deal', section: 'stats' },
  { key: 'purchase_count', type: 'readonly', label_ar: 'عدد مرات الشراء', label_en: 'Purchase count', section: 'stats' },
  { key: 'avg_purchase_amount', type: 'readonly', label_ar: 'متوسط المشتريات', label_en: 'Avg. purchase', section: 'stats' },
  // ——— فرد ———
  { key: 'full_name_quad', type: 'text', label_ar: 'الاسم رباعي', label_en: 'Full name', section: 'personal', individual_only: true, col_span: 2 },
  { key: 'national_id', type: 'text', label_ar: 'الرقم القومي', label_en: 'National ID', section: 'personal', individual_only: true },
  { key: 'id_derived_gender', type: 'readonly', label_ar: 'الجنس (من الرقم القومي)', label_en: 'Gender (from ID)', section: 'personal', individual_only: true },
  { key: 'id_derived_birth_date', type: 'readonly', label_ar: 'تاريخ الميلاد (تلقائي)', label_en: 'Birth date (auto)', section: 'personal', individual_only: true },
  { key: 'gender', type: 'select', label_ar: 'الجنس', label_en: 'Gender', section: 'personal', individual_only: true, options: [
    { value: 'male', label_ar: 'ذكر' },
    { value: 'female', label_ar: 'أنثى' },
  ]},
  { key: 'birth_date', type: 'date', label_ar: 'تاريخ الميلاد', label_en: 'Birth date', section: 'personal', individual_only: true },
  { key: 'job_title', type: 'text', label_ar: 'الوظيفة', label_en: 'Job', section: 'personal', individual_only: true },
  { key: 'employer', type: 'text', label_ar: 'جهة العمل', label_en: 'Employer', section: 'personal', individual_only: true },
  { key: 'marital_status', type: 'select', label_ar: 'الحالة الاجتماعية', label_en: 'Marital status', section: 'personal', individual_only: true, options: [
    { value: 'single', label_ar: 'أعزب' },
    { value: 'married', label_ar: 'متزوج' },
    { value: 'divorced', label_ar: 'مطلق' },
    { value: 'widowed', label_ar: 'أرمل' },
  ]},
  { key: 'spouse_name', type: 'text', label_ar: 'اسم الزوج / الزوجة', label_en: 'Spouse name', section: 'personal', individual_only: true, col_span: 2 },
  { key: 'children_count', type: 'number', label_ar: 'عدد الأبناء', label_en: 'Children', section: 'personal', individual_only: true },
  { key: 'phone', type: 'tel', label_ar: 'رقم الهاتف', label_en: 'Phone', section: 'contact' },
  { key: 'phone_verified', type: 'checkbox', label_ar: 'طريقة تواصل تم تأكيدها مسبقاً', label_en: 'Contact method verified', section: 'contact', individual_only: true, col_span: 2 },
  { key: 'extra_phone', type: 'tel', label_ar: 'هاتف إضافي', label_en: 'Extra phone', section: 'contact', individual_only: true },
  { key: 'email', type: 'email', label_ar: 'البريد الإلكتروني', label_en: 'Email', section: 'contact', individual_only: true },
  { key: 'salary', type: 'number', label_ar: 'المرتب', label_en: 'Salary', section: 'finance', individual_only: true },
  { key: 'income_source', type: 'text', label_ar: 'مصدر الدخل', label_en: 'Income source', section: 'finance', individual_only: true },
  { key: 'installment_plan', type: 'select', label_ar: 'نظام التقسيط', label_en: 'Installment plan', section: 'finance', individual_only: true, options: [
    { value: 'none', label_ar: 'بدون' },
    { value: 'monthly', label_ar: 'شهري' },
    { value: 'weekly', label_ar: 'أسبوعي' },
  ]},
  { key: 'interest_rate', type: 'number', label_ar: 'نسبة الفائدة %', label_en: 'Interest %', section: 'finance', individual_only: true },
  { key: 'risk_rating', type: 'select', label_ar: 'تقييم المخاطرة', label_en: 'Risk rating', section: 'finance', individual_only: true, options: [
    { value: 'low', label_ar: 'منخفض' },
    { value: 'medium', label_ar: 'متوسط' },
    { value: 'high', label_ar: 'مرتفع' },
  ]},
  { key: 'id_photo_front', type: 'file', label_ar: 'صورة البطاقة — وجه', label_en: 'ID front', section: 'files', individual_only: true },
  { key: 'id_photo_back', type: 'file', label_ar: 'صورة البطاقة — ظهر', label_en: 'ID back', section: 'files', individual_only: true },
  { key: 'utility_receipt', type: 'file', label_ar: 'إيصال مرافق', label_en: 'Utility receipt', section: 'files', individual_only: true },
  { key: 'contract_file', type: 'file', label_ar: 'عقد', label_en: 'Contract', section: 'files', individual_only: true },
  { key: 'credit_score_display', type: 'readonly', label_ar: 'Score ائتماني', label_en: 'Credit score', section: 'finance', individual_only: true },
  // مشترك مالي
  { key: 'credit_limit', type: 'number', label_ar: 'الحد الائتماني', label_en: 'Credit limit', section: 'finance' },
  { key: 'payment_days', type: 'select', label_ar: 'مدة السداد', label_en: 'Payment terms', section: 'finance', options: [
    { value: 'cash', label_ar: 'نقدي' },
    { value: 'credit_7', label_ar: '7 أيام' },
    { value: 'credit_15', label_ar: '15 يوم' },
    { value: 'credit_30', label_ar: '30 يوم' },
    { value: 'credit_60', label_ar: '60 يوم' },
    { value: 'installment', label_ar: 'أقساط' },
  ]},
  { key: 'discount_percent', type: 'number', label_ar: 'نسبة الخصم %', label_en: 'Discount %', section: 'finance' },
  { key: 'payment_method', type: 'select', label_ar: 'طريقة الدفع', label_en: 'Payment method', section: 'finance', options: [
    { value: 'cash', label_ar: 'نقدي' },
    { value: 'transfer', label_ar: 'تحويل' },
    { value: 'cheque', label_ar: 'شيك' },
    { value: 'card', label_ar: 'بطاقة' },
  ]},
  { key: 'notes', type: 'textarea', label_ar: 'ملاحظات', label_en: 'Notes', section: 'other', col_span: 2 },
];

export const SECTION_LABELS: Record<string, { ar: string; en: string }> = {
  shop: { ar: 'بيانات المحل', en: 'Shop data' },
  personal: { ar: 'البيانات الشخصية', en: 'Personal data' },
  contact: { ar: 'بيانات التواصل', en: 'Contact' },
  address: { ar: 'العنوان', en: 'Address' },
  files: { ar: 'المرفقات', en: 'Attachments' },
  finance: { ar: 'البيانات المالية', en: 'Financial' },
  guarantors: { ar: 'بيانات الضامنين', en: 'Guarantors' },
  ops: { ar: 'التشغيل والمندوب', en: 'Operations' },
  flags: { ar: 'حالة وإيقاف', en: 'Status flags' },
  stats: { ar: 'إحصائيات', en: 'Statistics' },
  other: { ar: 'أخرى', en: 'Other' },
};

export function getVisibleFields(slug: string): SmartFieldDef[] {
  return SMART_FIELD_CATALOG.filter((f) => {
    if (slug === 'shop') {
      if (f.individual_only || HIDDEN_FOR_SHOP.has(f.key)) return false;
      return true;
    }
    if (slug === 'individual') {
      if (f.shop_only) return false;
      return true;
    }
    return !f.shop_only && !f.individual_only;
  });
}

export function getMandatoryForSlug(slug: string): string[] {
  if (slug === 'shop') {
    return ['shop_name', 'owner_name', 'owner_phone', 'governorate', 'address_detail'];
  }
  if (slug === 'individual') {
    return ['full_name_quad', 'national_id', 'phone'];
  }
  return ['shop_name'];
}

export function schemaForApi(slug: string) {
  return getVisibleFields(slug).map((f) => ({
    key: f.key,
    type: f.type,
    section: f.section,
    label_ar: f.label_ar,
    label_en: f.label_en,
  }));
}
