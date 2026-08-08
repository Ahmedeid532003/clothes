/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import type { Product } from '../types';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
  description?: string;
  simulationProducts?: Product[];
}

export default function ScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = "ماسح الـ QR والباركود الذكي للملابس",
  description = "وجه الكاميرا نحو كود قطعة الملابس لإتمام المسح الضوئي فوراً.",
  simulationProducts = [],
}: ScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'simulation'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerContainerId = "qr-reader-container";
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const stopScanning = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanning", err);
      }
    }
    setScannerActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    if (activeTab === 'camera') {
      setCameraError(null);
      const timer = setTimeout(() => {
        try {
          const html5QrCode = new Html5Qrcode(scannerContainerId);
          html5QrCodeRef.current = html5QrCode;

          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              onScanSuccess(decodedText);
              stopScanning();
              onClose();
            },
            () => {
              // Ignore silent scan errors
            }
          ).then(() => {
            setScannerActive(true);
          }).catch((err) => {
            console.error("Error starting camera scanner:", err);
            setCameraError("عذراً، لم نتمكن من الوصول للكاميرا في المتصفح. يرجى تفعيل أذونات الكاميرا أو الانتقال لعلامة تبويب 'محاكي المسح السريع' بالجانب.");
            setScannerActive(false);
          });
        } catch (e) {
          console.error("Error creating Html5Qrcode object:", e);
          setCameraError("تعذر تهيئة برنامج الكاميرا.");
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        stopScanning();
      };
    } else {
      stopScanning();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" dir="rtl">
      <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg border border-emerald-100">
              <Camera size={16} />
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold text-slate-800 font-sans">{title}</h3>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">{description}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 pt-2.5 flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('camera')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all px-4 ${
              activeTab === 'camera'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            كاميرا البث المباشر
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all px-4 flex items-center gap-1 ${
              activeTab === 'simulation'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles size={12} />
            محاكي المسح السريع
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 flex flex-col items-center justify-center min-h-[280px]">
          {activeTab === 'camera' ? (
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="w-full bg-red-50 border border-red-100 rounded-xl p-3.5 text-center mb-3">
                  <AlertCircle className="mx-auto text-red-600 mb-1.5" size={24} />
                  <p className="text-xs text-slate-700 font-bold leading-normal">{cameraError}</p>
                  <button
                    onClick={() => setActiveTab('simulation')}
                    className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all border border-slate-200"
                  >
                    الانتقال لمحاكي المسح
                  </button>
                </div>
              ) : (
                <div className="relative w-full aspect-square max-w-[240px] bg-slate-900 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner">
                  <div id={scannerContainerId} className="absolute inset-0 w-full h-full [&_video]:object-cover" />
                  
                  {scannerActive && (
                    <div className="absolute inset-0 pointer-events-none border-[3px] border-emerald-500/10 m-5 rounded-lg flex items-center justify-center animate-pulse">
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-bounce" style={{ animationDuration: '2.5s' }}></div>
                      
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500"></div>
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-500"></div>
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-500"></div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-500"></div>
                    </div>
                  )}

                  {!scannerActive && (
                    <div className="text-center text-slate-400 flex flex-col items-center">
                      <RefreshCw size={20} className="animate-spin text-emerald-600 mb-1.5" />
                      <p className="text-[10px]">جاري تشغيل الكاميرا...</p>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-3 text-center leading-normal">
                ملاحظة: يدعم الكاميرا والمسح الذكي لأي ملصق ورقي مطبوع للباركود!
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3.5 text-right">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2.5 items-center">
                <Sparkles className="text-emerald-700 flex-shrink-0" size={18} />
                <p className="text-[10px] text-emerald-800 leading-relaxed font-semibold">
                  اختر أي قطعة ملابس من القائمة أدناه، وسيتصرف السيستم فوراً كأنك قمت بضرب باركود الورقة اللاصقة بالليزر تماماً!
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">اضغط لمسح ملصق الملابس:</label>
                <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {(simulationProducts.length > 0 ? simulationProducts : []).slice(0, 20).map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => {
                        onScanSuccess(prod.barcode);
                        onClose();
                      }}
                      className="flex items-center justify-between p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 rounded-xl transition-all text-right group text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-100"
                        />
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] group-hover:text-emerald-700 transition-colors">{prod.name}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">باركود: {prod.barcode}</p>
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-emerald-600 font-bold text-xs">{prod.price.toLocaleString()} ج.م</span>
                        <span className="block text-[8px] text-slate-400">انقر للضرب ⚡</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-500 block mb-1">أو اكتب كود الباركود يدوياً:</label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = (e.currentTarget.elements.namedItem('manualBarcode') as HTMLInputElement).value;
                    if (input) {
                      onScanSuccess(input);
                      onClose();
                    }
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    name="manualBarcode"
                    placeholder="مثال: 622110189001"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-center text-emerald-700 focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  >
                    تأكيد الكود
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
