/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Store, Laptop, Smartphone, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentMode: 'merchant' | 'customer';
  onChangeMode: (mode: 'merchant' | 'customer') => void;
  expectedBalance: number;
  openShift: string;
}

export default function Header({
  currentMode,
  onChangeMode,
  expectedBalance,
  openShift,
}: HeaderProps) {
  return (
    <header className="bg-white text-slate-800 shadow-sm border-b border-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-sm flex items-center justify-center">
            <Store size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              سكانر ملابس <span className="text-emerald-600 text-xs px-2 py-0.5 bg-emerald-50 rounded-full font-medium">الذكي للألبسة</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">نظام الكاشير وطباعة الباركود الخاص بمحلات الملابس</p>
          </div>
        </div>

        {/* Dynamic Center Info: Shift and Balance (Only relevant for merchant) */}
        {currentMode === 'merchant' && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-slate-400">الوردية المفتوحة:</span>
              <span className="font-mono font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">{openShift}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-slate-400">الرصيد الكلي:</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">{expectedBalance.toLocaleString()} ج.م</span>
            </div>
          </div>
        )}

        {currentMode === 'customer' && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-2 text-xs flex items-center gap-2 font-medium">
            <Smartphone size={15} className="animate-bounce" />
            <span>بوابة المشتري المباشرة - امسح ملصق الملابس واشترِ فوراً!</span>
          </div>
        )}

        {/* Portal Switcher Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
          <button
            id="switch-merchant-btn"
            onClick={() => onChangeMode('merchant')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentMode === 'merchant'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop size={14} />
            <span>لوحة الكاشير (POS)</span>
          </button>
          
          <button
            id="switch-customer-btn"
            onClick={() => onChangeMode('customer')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentMode === 'customer'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone size={14} />
            <span>شراء ذاتي (للزبائن)</span>
          </button>
        </div>
      </div>
    </header>
  );
}
