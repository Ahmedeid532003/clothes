/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Calendar, DollarSign, Edit3, Check, Scale, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { Customer, Installment } from '../types';
import confetti from 'canvas-confetti';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onUpdateCustomer: (updatedCustomer: Customer) => void;
}

export default function CustomerModal({
  isOpen,
  onClose,
  customer,
  onUpdateCustomer
}: CustomerModalProps) {
  const [activeTab, setActiveTab] = useState<'installments' | 'statement' | 'edit'>('installments');
  
  // Form/Edit states
  const [notes, setNotes] = useState(customer?.notes || '');
  const [group, setGroup] = useState(customer?.group || 'عادي A');
  const [status, setStatus] = useState(customer?.status || 'Active');
  
  // Installment restructure states
  const [restructureCount, setRestructureCount] = useState<number>(3);
  const [showRestructureAlert, setShowRestructureAlert] = useState(false);

  React.useEffect(() => {
    if (customer) {
      setNotes(customer.notes);
      setGroup(customer.group);
      setStatus(customer.status);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  // Handle Pay Installment
  const handlePayInstallment = (instId: string) => {
    const updatedInstallments = customer.installments.map(inst => {
      if (inst.id === instId) {
        return {
          ...inst,
          status: 'paid' as const,
          paidDate: new Date().toISOString().split('T')[0]
        };
      }
      return inst;
    });

    // Calculate new balance
    const totalPaid = customer.installments.find(i => i.id === instId)?.amount || 0;
    const newBalance = Math.max(0, customer.balance - totalPaid);

    const updatedCustomer: Customer = {
      ...customer,
      balance: newBalance,
      installments: updatedInstallments
    };

    onUpdateCustomer(updatedCustomer);
    
    // Confetti!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  // Restructure Installments
  const handleRestructure = () => {
    if (customer.balance <= 0) return;

    const installmentAmount = Math.ceil(customer.balance / restructureCount);
    const newInstallments: Installment[] = [];
    
    const today = new Date();
    for (let i = 1; i <= restructureCount; i++) {
      const dueDate = new Date(today.getFullYear(), today.getMonth() + i, 15);
      newInstallments.push({
        id: `inst-restruct-${Date.now()}-${i}`,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: installmentAmount,
        status: 'unpaid'
      });
    }

    const updatedCustomer: Customer = {
      ...customer,
      installments: newInstallments,
      notes: `${customer.notes} (تم إعادة هيكلة الأقساط إلى ${restructureCount} أشهر بتاريخ ${new Date().toLocaleDateString('ar-EG')})`
    };

    onUpdateCustomer(updatedCustomer);
    setShowRestructureAlert(false);
    setActiveTab('installments');
    
    confetti({
      particleCount: 100,
      spread: 70,
      colors: ['#10b981', '#3b82f6']
    });
  };

  // Save general info edits
  const handleSaveInfo = () => {
    const updatedCustomer: Customer = {
      ...customer,
      notes,
      group,
      status
    };
    onUpdateCustomer(updatedCustomer);
    alert('تم حفظ البيانات بنجاح!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex justify-between items-start bg-slate-950/20">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white font-sans">{customer.name}</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                customer.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                customer.status === 'Restricted' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                'bg-slate-500/15 text-slate-400 border border-slate-500/20'
              }`}>
                {customer.status === 'Active' ? 'نشط' : customer.status === 'Restricted' ? 'مقيد السداد' : 'غير نشط'}
              </span>
              <span className="text-xs bg-slate-800 border border-slate-700 rounded px-2 text-slate-300 font-mono">
                {customer.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">هاتف: {customer.phone} | الضامنين: {customer.guarantors?.join('، ') || 'لا يوجد'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-5 pt-2 flex border-b border-slate-800/50 bg-slate-950/10">
          <button
            onClick={() => setActiveTab('installments')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all px-4 flex items-center gap-1.5 ${
              activeTab === 'installments'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar size={14} />
            جدول الأقساط
          </button>
          <button
            onClick={() => setActiveTab('statement')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all px-4 flex items-center gap-1.5 ${
              activeTab === 'statement'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale size={14} />
            إعادة الهيكلة والتحصيل
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all px-4 flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 size={14} />
            تعديل التقييم والملاحظات
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: INSTALLMENTS */}
          {activeTab === 'installments' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 text-right">
                  <span className="text-xs text-slate-400 block mb-1">إجمالي المديونية المستحقة:</span>
                  <span className="text-xl font-bold font-mono text-amber-400">{customer.balance.toLocaleString()} ج.م</span>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 text-right">
                  <span className="text-xs text-slate-400 block mb-1">الأقساط المتبقية:</span>
                  <span className="text-xl font-bold font-mono text-white">
                    {customer.installments.filter(i => i.status !== 'paid').length} أقساط
                  </span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/15">
                <div className="p-3 bg-slate-950/40 border-b border-slate-800 font-bold text-xs text-slate-300">
                  قائمة الأقساط المجدولة للعميل:
                </div>
                {customer.installments.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    لا توجد أقساط مجدولة حالياً لهذا العميل.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {customer.installments.map((inst, index) => (
                      <div key={inst.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-all text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${
                            inst.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                            inst.status === 'overdue' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            <DollarSign size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-white font-mono">{inst.amount.toLocaleString()} ج.م</p>
                            <p className="text-xs text-slate-400 mt-0.5 font-mono">تاريخ الاستحقاق: {inst.dueDate}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inst.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10' :
                            inst.status === 'overdue' ? 'bg-red-500/15 text-red-400 border border-red-500/10 animate-pulse' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {inst.status === 'paid' ? 'تم السداد' : inst.status === 'overdue' ? 'متأخر سداد' : 'قيد الانتظار'}
                          </span>

                          {inst.status !== 'paid' && (
                            <button
                              id={`pay-inst-${inst.id}`}
                              onClick={() => handlePayInstallment(inst.id)}
                              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-md shadow-emerald-500/5"
                            >
                              <Check size={12} />
                              تسديد الآن
                            </button>
                          )}
                          {inst.status === 'paid' && inst.paidDate && (
                            <span className="text-[10px] text-slate-500 font-mono">سُدد في: {inst.paidDate}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RESTRUCTURE & CREDIT */}
          {activeTab === 'statement' && (
            <div className="space-y-4">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-right">
                <ShieldAlert className="text-amber-400 flex-shrink-0" size={24} />
                <div>
                  <h4 className="text-xs font-bold text-amber-200">إعادة الهيكلة الذكية للأقساط:</h4>
                  <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                    تسمح لك هذه الميزة بإعادة جدولة إجمالي المديونية الحالية للعميل وتوزيعها بالتساوي على فترة سداد جديدة لحل تعثر الدفع أو تعديل خطة الأقساط.
                  </p>
                </div>
              </div>

              {customer.balance <= 0 ? (
                <div className="p-8 text-center bg-slate-950/30 rounded-2xl text-slate-500 border border-slate-800 text-sm">
                  لا توجد مديونية على هذا العميل لإعادة هيكلتها. رصيده الحالي هو صفر.
                </div>
              ) : (
                <div className="bg-slate-950/30 border border-slate-800 rounded-2xl p-5 space-y-4 text-right">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-xs text-slate-300 font-bold">المبلغ الإجمالي لإعادة الهيكلة:</span>
                    <span className="font-mono text-amber-400 font-bold text-base">{customer.balance.toLocaleString()} ج.م</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">اختر فترة الجدولة الجديدة:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[3, 6, 12].map((months) => (
                        <button
                          key={months}
                          type="button"
                          onClick={() => setRestructureCount(months)}
                          className={`py-3 rounded-xl border font-bold text-sm transition-all flex flex-col items-center justify-center gap-1 ${
                            restructureCount === months
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>{months} أشهر</span>
                          <span className={`text-[10px] font-mono ${restructureCount === months ? 'text-slate-800' : 'text-slate-400'}`}>
                            {Math.ceil(customer.balance / months).toLocaleString()} ج.م / شهر
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {showRestructureAlert ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
                      <p className="text-xs text-red-200">
                        تحذير: هل أنت متأكد من مسح جدول الأقساط القديم واعتماد جدول أقساط جديد لـ {restructureCount} أشهر؟ هذا الإجراء سيغير مديونية العميل بشكل دائم.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={handleRestructure}
                          className="px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          تأكيد الهيكلة
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRestructureAlert(false)}
                          className="px-4 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs transition-all"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      id="restructure-confirm-trigger"
                      onClick={() => setShowRestructureAlert(true)}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/5"
                    >
                      إعادة هيكلة أقساط العميل الآن
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EDIT NOTES / ASSESSMENT */}
          {activeTab === 'edit' && (
            <div className="space-y-4 text-right">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">مجموعة تصنيف العميل:</label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="عادي A">عادي A</option>
                    <option value="عادي B">عادي B</option>
                    <option value="مميز VIP">مميز VIP</option>
                    <option value="حظر توريد">حظر توريد</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">حالة سداد العميل الميدانية:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Active">نشط (سداد طبيعي)</option>
                    <option value="Restricted">مقيد السداد (متأخر)</option>
                    <option value="Inactive">غير نشط / حظر</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">الملاحظات والتقييم السلوكي للعميل:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
                  placeholder="اكتب أي تفاصيل أخرى عن المواعيد أو سلوك السداد..."
                />
              </div>

              <button
                id="save-customer-info-btn"
                onClick={handleSaveInfo}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/5 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                حفظ التعديلات والتقييم للعميل
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800/80 bg-slate-950/20 text-left">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-all"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
