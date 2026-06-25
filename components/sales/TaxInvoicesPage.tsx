import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Building2, Printer, QrCode, ReceiptText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { taxInvoicesApi, type SalesInvoiceDto } from '@/lib/api/sales';
import { Button } from '@/components/ui/button';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import { ErpRowActions } from '@/components/erp/ErpRowActions';

function taxPayload(row: SalesInvoiceDto) {
  return row.qr_payload || JSON.stringify({
    invoice_number: row.code,
    seller: row.company_name,
    tax_registration_number: row.tax_registration_number,
    vat_amount: row.tax_amount,
    total: row.total,
  });
}

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: 'نقدي',
    card: 'بطاقة',
    wallet: 'محفظة',
    credit: 'آجل',
    installment: 'تقسيط',
    reserved: 'حجز',
    mixed: 'مختلط',
  };
  return labels[method] ?? method;
}

export function TaxInvoicesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SalesInvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SalesInvoiceDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taxInvoicesApi.list();
      setRows(data);
      setActive((current) => current ?? data[0] ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () => rows.reduce(
      (acc, row) => ({
        subtotal: acc.subtotal + Number(row.subtotal || 0),
        tax: acc.tax + Number(row.tax_amount || 0),
        total: acc.total + Number(row.total || 0),
      }),
      { subtotal: 0, tax: 0, total: 0 },
    ),
    [rows],
  );

  const printActive = () => {
    if (!active) return;
    const qr = document.getElementById(`tax-qr-${active.id}`)?.outerHTML ?? '';
    const lines = active.lines.map((line) => `
      <tr>
        <td>${line.product_code}</td>
        <td>${line.product_name}</td>
        <td>${line.quantity}</td>
        <td>${line.unit_price}</td>
        <td>${line.line_total}</td>
      </tr>
    `).join('');
    const html = `
      <html dir="rtl">
        <head>
          <title>فاتورة ضريبية ${active.code}</title>
          <style>
            body{font-family:Arial,sans-serif;margin:24px;color:#111827}
            .head{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #111827;padding-bottom:12px}
            .badge{border:1px solid #111827;border-radius:999px;padding:6px 14px;font-weight:700;display:inline-block}
            .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
            .box{border:1px solid #d1d5db;border-radius:10px;padding:12px}
            table{width:100%;border-collapse:collapse;margin-top:12px}
            th,td{border:1px solid #d1d5db;padding:8px;text-align:right}
            th{background:#f3f4f6}
            .totals{width:340px;margin-right:auto;margin-top:16px}
            .totals div{display:flex;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding:6px 0}
            .final{font-size:20px;font-weight:800}
            .qr svg{width:130px;height:130px}
          </style>
        </head>
        <body>
          <div class="head">
            <div>
              <span class="badge">فاتورة ضريبية رسمية</span>
              <h2>${active.company_name || 'بيانات الشركة'}</h2>
              <p>الرقم الضريبي: ${active.tax_registration_number || '-'}</p>
              <p>الفرع: ${active.branch_name || '-'} | العنوان: ${active.branch_address || '-'}</p>
              <p>هاتف: ${active.company_phone || '-'}</p>
            </div>
            <div class="qr">${qr}<p>${active.code}</p></div>
          </div>
          <div class="grid">
            <div class="box">
              <b>بيانات الفاتورة</b>
              <p>رقم الفاتورة: ${active.code}</p>
              <p>التاريخ: ${new Date(active.created_at).toLocaleString()}</p>
              <p>طريقة الدفع: ${paymentLabel(active.payment_method)}</p>
            </div>
            <div class="box">
              <b>بيانات العميل</b>
              <p>الاسم: ${active.customer_name || 'عميل نقدي'}</p>
              <p>الرقم الضريبي للعميل: ${active.customer_tax_registration_number || '-'}</p>
            </div>
          </div>
          <table>
            <thead><tr><th>الكود</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
            <tbody>${lines}</tbody>
          </table>
          <div class="totals">
            <div><span>الإجمالي قبل الضريبة</span><b>${active.subtotal}</b></div>
            <div><span>الخصم</span><b>${active.discount_amount}</b></div>
            <div><span>VAT ${active.tax_percent}%</span><b>${active.tax_amount}</b></div>
            <div class="final"><span>الإجمالي النهائي</span><b>${active.total}</b></div>
          </div>
          <p style="margin-top:24px;color:#6b7280">جاهزة للتكامل مع الفاتورة الإلكترونية ETA: البيانات الضريبية محفوظة داخل QR payload.</p>
        </body>
      </html>`;
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<BadgeCheck className="h-6 w-6" />}
        title={t('nav.taxInvoices')}
        description={t('sales.taxDesc')}
        actions={<PageToolbar onRefresh={load} />}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500">عدد الفواتير الضريبية</p>
          <p className="mt-1 text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500">إجمالي VAT</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{fmtMoney(totals.tax)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500">إجمالي الفواتير</p>
          <p className="mt-1 text-2xl font-bold">{fmtMoney(totals.total)}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('sales.customer')}</th>
              <th className="px-3 py-2 text-start">{t('sales.taxNumber')}</th>
              <th className="px-3 py-2 text-end">VAT %</th>
              <th className="px-3 py-2 text-end">{t('sales.tax')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.amount')}</th>
              <th className="px-3 py-2 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center">{t('inventory.loading')}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">{t('sales.noTaxInvoices')}</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={`border-t hover:bg-slate-50 ${active?.id === row.id ? 'bg-blue-50/60' : ''}`}>
                  <td className="px-3 py-2 font-mono">{row.code}</td>
                  <td className="px-3 py-2">{row.customer_name || '—'}</td>
                  <td className="px-3 py-2">{row.tax_registration_number || '—'}</td>
                  <td className="px-3 py-2 text-end">{row.tax_percent}%</td>
                  <td className="px-3 py-2 text-end">{fmtMoney(row.tax_amount)}</td>
                  <td className="px-3 py-2 text-end font-semibold">{fmtMoney(row.total)}</td>
                  <td className="px-3 py-2 text-end">
                    <ErpRowActions onView={() => setActive(row)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-900 px-3 py-1 text-sm font-bold">
                <ReceiptText className="h-4 w-4" />
                فاتورة ضريبية رسمية
              </div>
              <h3 className="mt-3 text-2xl font-bold">{active.company_name || 'بيانات الشركة'}</h3>
              <p className="mt-1 text-sm text-slate-600">
                الرقم الضريبي: <b>{active.tax_registration_number || '—'}</b>
              </p>
              <p className="text-sm text-slate-600">
                {active.branch_name || '—'} · {active.branch_address || 'بدون عنوان'}
              </p>
            </div>
            <div className="text-center">
              <QRCodeSVG id={`tax-qr-${active.id}`} value={taxPayload(active)} size={128} />
              <p className="mt-2 font-mono text-xs">{active.code}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-3">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <Building2 className="h-4 w-4" />
                بيانات الشركة
              </div>
              <p className="text-sm">الهاتف: {active.company_phone || '—'}</p>
              <p className="text-sm">الفرع: {active.branch_name || '—'}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="font-bold">بيانات العميل</p>
              <p className="text-sm">الاسم: {active.customer_name || 'عميل نقدي'}</p>
              <p className="text-sm">الرقم الضريبي: {active.customer_tax_registration_number || '—'}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-start">الكود</th>
                  <th className="px-3 py-2 text-start">{t('inventory.product')}</th>
                  <th className="px-3 py-2 text-end">{t('sales.returnQty')}</th>
                  <th className="px-3 py-2 text-end">{t('purchases.unitPrice')}</th>
                  <th className="px-3 py-2 text-end">{t('accounting.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {active.lines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="px-3 py-2 font-mono">{line.product_code}</td>
                    <td className="px-3 py-2">{line.product_name}</td>
                    <td className="px-3 py-2 text-end">{line.quantity}</td>
                    <td className="px-3 py-2 text-end">{fmtMoney(line.unit_price)}</td>
                    <td className="px-3 py-2 text-end font-semibold">{fmtMoney(line.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <div className="mb-1 flex items-center gap-1 font-bold text-slate-900">
                <QrCode className="h-4 w-4" />
                ETA-ready QR payload
              </div>
              يدعم ربط الفاتورة الإلكترونية لاحقًا لأن بيانات البائع، المشتري، VAT والإجمالي محفوظة داخل QR.
            </div>
            <div className="w-full max-w-sm rounded-xl border p-3 text-sm">
              <p className="flex justify-between"><span>{t('purchases.subtotal')}</span><b>{fmtMoney(active.subtotal)}</b></p>
              <p className="flex justify-between"><span>{t('sales.discount')}</span><b>{fmtMoney(active.discount_amount)}</b></p>
              <p className="flex justify-between"><span>VAT {active.tax_percent}%</span><b>{fmtMoney(active.tax_amount)}</b></p>
              <p className="mt-2 flex justify-between border-t pt-2 text-xl font-bold"><span>{t('accounting.amount')}</span><b>{fmtMoney(active.total)}</b></p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={printActive}>
              <Printer className="me-2 h-4 w-4" />
              طباعة الفاتورة الضريبية
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

