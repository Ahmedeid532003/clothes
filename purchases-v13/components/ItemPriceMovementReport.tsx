import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface ItemPriceMovementReportProps {
  lang: 'ar' | 'en';
  params?: any;
}

export const mockPriceMovementData = [
  {
    barcode: "23252252",
    brandAr: "زارا",
    brandEn: "Zara",
    nameAr: "قميص كاروه مقلم",
    nameEn: "Striped Plaid Shirt",
    model: "300",
    totalChange: 200,
    details: [
      {
        date: "16/05/2026",
        docNumber: "5555500555",
        quantity: 10,
        purchasePrice: 200,
        docTypeAr: "فاتوره مشتريات",
        docTypeEn: "Purchase Invoice",
        priceDifference: 0,
        userAr: "هانى",
        userEn: "Hany",
        branchAr: "المسرح الرومانى",
        branchEn: "Roman Theater",
      },
      {
        date: "18/05/2026",
        docNumber: "55550",
        quantity: 20,
        purchasePrice: 300,
        docTypeAr: "فاتوره مشتريات",
        docTypeEn: "Purchase Invoice",
        priceDifference: 100,
        userAr: "احمد",
        userEn: "Ahmed",
        branchAr: "سعد زغلول",
        branchEn: "Saad Zaghloul",
      },
      {
        date: "20/06/2026",
        docNumber: "350",
        quantity: 5,
        purchasePrice: 300,
        docTypeAr: "فاتوره مشتريات",
        docTypeEn: "Purchase Invoice",
        priceDifference: 0,
        userAr: "عمر",
        userEn: "Omar",
        branchAr: "سعد زغلول",
        branchEn: "Saad Zaghloul",
      },
      {
        date: "20/06/2026",
        docNumber: "55550",
        quantity: 20,
        purchasePrice: 400,
        docTypeAr: "فاتوره مشتريات",
        docTypeEn: "Purchase Invoice",
        priceDifference: 100,
        userAr: "احمد",
        userEn: "Ahmed",
        branchAr: "سعد زغلول",
        branchEn: "Saad Zaghloul",
      }
    ]
  },
  {
    barcode: "98765432",
    brandAr: "بولو",
    brandEn: "Polo",
    nameAr: "تيشيرت صيفي",
    nameEn: "Summer T-Shirt",
    model: "150",
    totalChange: 50,
    details: [
      {
        date: "10/05/2026",
        docNumber: "12345",
        quantity: 50,
        purchasePrice: 150,
        docTypeAr: "فاتوره مشتريات",
        docTypeEn: "Purchase Invoice",
        priceDifference: 0,
        userAr: "محمود",
        userEn: "Mahmoud",
        branchAr: "الفرع الرئيسي",
        branchEn: "Main Branch",
      },
      {
        date: "12/05/2026",
        docNumber: "12346",
        quantity: 30,
        purchasePrice: 200,
        docTypeAr: "فاتوره مشتريات",
        docTypeEn: "Purchase Invoice",
        priceDifference: 50,
        userAr: "خالد",
        userEn: "Khaled",
        branchAr: "الفرع الرئيسي",
        branchEn: "Main Branch",
      }
    ]
  }
];

export function ItemPriceMovementReport({ lang, params }: ItemPriceMovementReportProps) {
  const isAr = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = mockPriceMovementData.filter(item => 
    item.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.barcode.includes(searchTerm)
  );

  return (
    <div className="h-full flex flex-col space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {/* Search Bar matching the style (though simplified as requested) */}
      <div className="bg-white px-4 rounded-xl border border-gray-200 shadow-sm -mt-[14px] h-[45px] -mx-[8px] flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-[392px]">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={isAr ? "بحث بالباركود أو اسم الصنف..." : "Search by barcode or name..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-[32px] bg-slate-50 border border-gray-300 focus:border-orange-500 rounded-lg pl-10 rtl:pl-4 rtl:pr-10 pr-4 text-sm outline-none transition-colors"
            dir={isAr ? 'rtl' : 'ltr'}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto -mx-[8px] pb-20">
        <div className="flex flex-col gap-6">
          {filteredData.map((item, idx) => (
            <div key={idx} className="bg-white border border-orange-200 rounded-xl overflow-hidden shadow-sm">
              
              {/* Item Header */}
              <div className="bg-slate-50 border-b border-orange-200 p-3 sm:p-4 flex flex-row items-center justify-between gap-4 overflow-x-auto">
                <div className="flex flex-row items-center gap-3 shrink-0">
                  {isAr ? (
                    <>
                      <div className="bg-white px-3 py-1.5 border border-gray-300 rounded-lg text-slate-700 text-xs font-bold shadow-sm whitespace-nowrap">
                        الباركود: <span className="font-mono font-black ml-1 text-slate-500">{item.barcode}</span>
                      </div>
                      <div className="flex items-center gap-2 px-2">
                        <span className="font-black text-slate-600 text-[14px]">{item.model}</span>
                        <span className="text-gray-300">|</span>
                        <h3 className="text-[14px] sm:text-[15px] font-black text-[#0a1945] whitespace-nowrap">
                          {item.nameAr}
                        </h3>
                        {item.brandAr && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="font-black text-slate-600 text-[14px]">{item.brandAr}</span>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-2">
                        <span className="font-black text-slate-600 text-[14px]">{item.model}</span>
                        <span className="text-gray-300">|</span>
                        <h3 className="text-[14px] sm:text-[15px] font-black text-[#0a1945] whitespace-nowrap">
                          {item.nameEn}
                        </h3>
                        {item.brandEn && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="font-black text-slate-600 text-[14px]">{item.brandEn}</span>
                          </>
                        )}
                      </div>
                      <div className="bg-white px-3 py-1.5 border border-gray-300 rounded-lg text-slate-700 text-xs font-bold shadow-sm whitespace-nowrap">
                        Barcode: <span className="font-mono font-black ml-1 text-slate-500">{item.barcode}</span>
                      </div>
                    </>
                  )}
                </div>
                  
                <div className="bg-white px-4 py-1.5 border border-orange-300 rounded-lg text-slate-700 text-xs font-bold shadow-sm shrink-0 whitespace-nowrap">
                  {isAr ? "اجمالى التغير" : "Total Change"}: <span className="text-orange-600 ml-2 font-black text-[14px]">{item.totalChange}</span>
                </div>
              </div>

              {/* Item Details - Desktop Table */}
              <div className="w-full">
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left rtl:text-right border-collapse text-xs font-bold text-slate-700">
                    <thead className="sticky top-0 z-30 bg-orange-500 text-white select-none">
                      <tr className="bg-orange-500 text-white font-extrabold border-b border-white/30">
                        <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? 'رقم المستند' : 'Doc Number'}</th>
                        <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? 'الكميه' : 'Qty'}</th>
                        <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? 'سعر الشراء' : 'Purchase Price'}</th>
                        <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? 'الفرق ف السعر' : 'Price Diff'}</th>
                        <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? 'المستخدم' : 'User'}</th>
                        <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? 'الفرع' : 'Branch'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300 text-[#040466]">
                      {item.details.map((detail, dIdx) => (
                        <tr key={dIdx} className={cn("transition-colors hover:bg-orange-50/70 border-b border-gray-200", dIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                          <td className="p-1.5 whitespace-nowrap text-center font-bold text-slate-700">{detail.date}</td>
                          <td className="p-1.5 whitespace-nowrap text-center font-bold">
                            <button className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer text-xs font-black">
                              {detail.docNumber}
                            </button>
                          </td>
                          <td className="p-1.5 whitespace-nowrap text-center font-bold text-slate-700">{detail.quantity}</td>
                          <td className="p-1.5 whitespace-nowrap text-center font-bold text-slate-700">{detail.purchasePrice}</td>
                          <td className="p-1.5 whitespace-nowrap text-center font-black text-orange-600">{detail.priceDifference}</td>
                          <td className="p-1.5 whitespace-nowrap text-center font-bold text-slate-700">{isAr ? detail.userAr : detail.userEn}</td>
                          <td className="p-1.5 whitespace-nowrap text-center font-bold text-slate-700">{isAr ? detail.branchAr : detail.branchEn}</td>
                        </tr>
                      ))}
                      {item.details.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-slate-400 text-center font-bold">
                            {isAr ? "لا توجد حركات" : "No movements"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards (Fallback for responsive) */}
                <div className="lg:hidden flex flex-col gap-3 p-3 bg-slate-50">
                  {item.details.map((detail, dIdx) => (
                    <div key={dIdx} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[12px]">{isAr ? 'رقم المستند' : 'Doc Num'}:</span>
                          <button className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer font-black text-[13px]">
                            {detail.docNumber}
                          </button>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">{detail.date}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{isAr ? 'الكميه' : 'Qty'}</span>
                          <span className="font-bold text-slate-700">{detail.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{isAr ? 'سعر الشراء' : 'Purchase Price'}</span>
                          <span className="font-bold text-slate-700">{detail.purchasePrice}</span>
                        </div>
                        <div className="col-span-2 flex justify-between items-center py-1.5 bg-orange-50/50 -mx-1 px-2 rounded">
                          <span className="text-slate-600 font-bold">{isAr ? 'الفرق ف السعر' : 'Price Diff'}</span>
                          <span className="font-black text-orange-600 text-[13px]">{detail.priceDifference}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{isAr ? 'المستخدم' : 'User'}</span>
                          <span className="font-bold text-slate-700">{isAr ? detail.userAr : detail.userEn}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{isAr ? 'الفرع' : 'Branch'}</span>
                          <span className="font-bold text-slate-700">{isAr ? detail.branchAr : detail.branchEn}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
