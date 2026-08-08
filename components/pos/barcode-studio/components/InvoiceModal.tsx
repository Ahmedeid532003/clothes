/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, CheckCircle2, Receipt, Calendar, User, CreditCard } from 'lucide-react';
import { Transaction } from '../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function InvoiceModal({ isOpen, onClose, transaction }: InvoiceModalProps) {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('printable-invoice');
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (printWindow) {
      printWindow.document.write('<html><head><title>فاتورة البيع</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; color: #1e293b; background: white; }
        .invoice-box { max-width: 500px; margin: auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 13px; }
        th { background-color: #f8fafc; font-weight: bold; }
        .total-row { font-weight: bold; font-size: 14px; background-color: #f8fafc; }
        .qr-placeholder { text-align: center; margin-top: 20px; }
        .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
      `);
      printWindow.document.write('</style></head><body>');
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'نقداً (كاش)';
      case 'card': return 'بطاقة ائتمان (فيزا)';
      case 'wallet': return 'محفظة إلكترونية';
      default: return method;
    }
  };

  const qrData = encodeURIComponent(`InvoiceID: ${transaction.id}\nTotal: ${transaction.total} EGP\nDate: ${transaction.date}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" dir="rtl">
      <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-800">تم تسجيل العملية بنجاح!</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable invoice section */}
        <div className="p-5 overflow-y-auto max-h-[70vh] bg-slate-50">
          
          {/* Print container start */}
          <div id="printable-invoice" className="bg-white text-slate-800 p-5 rounded-xl border border-slate-200 shadow-xs text-right">
            
            {/* Store branding */}
            <div className="text-center pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 font-sans">بوتيك الملابس الجاهزة</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">فرع وسط البلد - بيع ملابس كاشير ذكي</p>
              <p className="text-[9px] text-slate-400">سجل تجاري: ٧٦٥٤٣ • هاتف: ٠١٠٩٩٨٨٧٧٦٦</p>
            </div>

            {/* Invoice meta info */}
            <div className="grid grid-cols-2 gap-3 py-3 text-[11px] border-b border-slate-100 text-slate-600">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Receipt size={11} className="text-slate-400" />
                  <span>رقم الفاتورة:</span>
                  <span className="font-mono font-bold text-slate-800">{transaction.id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={11} className="text-slate-400" />
                  <span>التاريخ والوقت:</span>
                  <span className="font-mono text-slate-800">{new Date(transaction.date).toLocaleString('ar-EG')}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <User size={11} className="text-slate-400" />
                  <span>العميل:</span>
                  <span className="font-bold text-slate-800">{transaction.customerName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard size={11} className="text-slate-400" />
                  <span>طريقة الدفع:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                    {getPaymentMethodLabel(transaction.paymentMethod)}
                  </span>
                </div>
              </div>
            </div>

            {/* If Exchange/Return, show returned items */}
            {transaction.returnedItems && transaction.returnedItems.length > 0 && (
              <div className="py-2.5 border-b border-dashed border-red-100">
                <h4 className="text-[11px] font-bold text-red-600 mb-1">← البضائع المرتجعة:</h4>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-red-50 text-red-800">
                      <th className="py-1 text-right">قطعة الملابس</th>
                      <th className="py-1 text-center">الكمية</th>
                      <th className="py-1 text-left">قيمة المرتجع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transaction.returnedItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-50 text-slate-600">
                        <td className="py-1">{item.product.name}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-left font-mono">-{item.product.price.toLocaleString()} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table items */}
            <div className="py-3">
              <h4 className="text-[11px] font-bold text-slate-700 mb-1.5">
                {transaction.returnedItems ? '← البضائع المشتراة البديلة:' : '← الملابس المبيعة:'}
              </h4>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                    <th className="py-1 text-right">الموديل المقاس واللون</th>
                    <th className="py-1 text-center">الكمية</th>
                    <th className="py-1 text-center">السعر</th>
                    <th className="py-1 text-center">خصم</th>
                    <th className="py-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item, idx) => {
                    const rowTotal = (item.product.price * item.quantity) - item.discount;
                    return (
                      <tr key={idx} className="border-b border-slate-100 text-slate-700">
                        <td className="py-2 font-medium">
                          {item.product.name}
                          <span className="block text-[9px] text-slate-400">
                            (مقاس: {item.product.specifications?.['المقاس'] || 'N/A'} • لون: {item.product.specifications?.['اللون'] || 'N/A'})
                          </span>
                        </td>
                        <td className="py-2 text-center font-mono">{item.quantity}</td>
                        <td className="py-2 text-center font-mono">{item.product.price.toLocaleString()}</td>
                        <td className="py-2 text-center font-mono text-red-500">{item.discount > 0 ? `-${item.discount}` : '٠'}</td>
                        <td className="py-2 text-left font-mono font-semibold">{rowTotal.toLocaleString()} ج.م</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{transaction.subtotal.toLocaleString()} ج.م</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-red-500 font-medium">
                  <span>إجمالي الخصومات:</span>
                  <span className="font-mono">-{transaction.discount.toLocaleString()} ج.م</span>
                </div>
              )}
              {transaction.returnedItems && transaction.returnedItems.length > 0 && (
                <div className="flex justify-between text-indigo-600">
                  <span>إجمالي المرتجع:</span>
                  <span className="font-mono">
                    -{transaction.returnedItems.reduce((acc, it) => acc + (it.product.price * it.quantity), 0).toLocaleString()} ج.م
                  </span>
                </div>
              )}
              <div className="h-px bg-slate-200 my-0.5"></div>
              <div className="flex justify-between text-slate-900 font-extrabold text-xs">
                <span>الصافي النهائي:</span>
                <span className="font-mono text-blue-600">{transaction.total.toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* Dynamic QR Code */}
            <div className="flex flex-col items-center justify-center pt-4">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                referrerPolicy="no-referrer"
                className="w-20 h-20 border border-slate-100 p-1 rounded-lg bg-slate-50"
              />
              <p className="text-[8px] text-slate-400 mt-1 text-center">
                رابط مطابقة الباركود المطبوع لملابس البوتيك الذكية
              </p>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 mt-3 border-t border-dashed border-slate-200 text-[9px] text-slate-400">
              <p>شكراً لتسوقكم • الملابس تستبدل خلال ١٤ يوماً بالملصق</p>
              <p className="mt-0.5 font-mono">طُوّر بنظام بيع الباركود الذكي للملابس ٢٠٢٦</p>
            </div>

          </div>
          {/* Print container end */}

        </div>

        {/* Footer buttons */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
          <button
            id="print-invoice-btn"
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-xs"
          >
            <Printer size={15} />
            <span>طباعة الإيصال الفوري (Thermal)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
