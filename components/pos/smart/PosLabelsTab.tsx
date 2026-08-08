import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Printer, Smartphone, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  fetchBarcodeLabels,
  fetchProducts,
  fetchWarehouses,
  type BarcodeLabelDto,
  type ProductDto,
} from '@/lib/api/inventory';
import { fmtPosAmount } from '../pos-utils';

type Props = {
  activeBranchId: string;
  onSimulateScan: (barcode: string) => void;
  onMessage: (msg: string) => void;
};

function stickerPrintHtml(opts: {
  shopName: string;
  productName: string;
  size: string;
  color: string;
  barcode: string;
  price: string;
  currency: string;
  sizeLabel: string;
  colorLabel: string;
  sellingPriceLabel: string;
  copies: number;
}) {
  const cards = Array.from({ length: opts.copies }, () => `
    <div class="sticker">
      <div class="hole"></div>
      <div class="shop">${opts.shopName}</div>
      <div class="product">${opts.productName}</div>
      <div class="attrs">
        <span>${opts.sizeLabel}: ${opts.size}</span>
        <span>${opts.colorLabel}: ${opts.color}</span>
      </div>
      <div class="qr-wrap"><img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(opts.barcode)}" alt="" /></div>
      <div class="barcode-num">${opts.barcode}</div>
      <div class="foot">
        <div class="price-box">${opts.price} ${opts.currency}</div>
        <div class="price-lbl">${opts.sellingPriceLabel}</div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>Labels</title>
  <style>
    @page { margin: 6mm; }
    body { font-family: Cairo, Tahoma, sans-serif; margin: 0; padding: 8px; background: #fff; }
    .sheet { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; }
    .sticker {
      position: relative; width: 52mm; min-height: 78mm; border: 2px solid #1e293b; border-radius: 12px;
      padding: 10px 8px 8px; text-align: center; background: #fff; page-break-inside: avoid;
      box-sizing: border-box;
    }
    .hole { position: absolute; top: 6px; inset-inline-end: 8px; width: 10px; height: 10px; border: 2px solid #334155; border-radius: 999px; }
    .shop { font-size: 9px; font-weight: 800; color: #475569; margin-bottom: 4px; }
    .product { font-size: 11px; font-weight: 900; line-height: 1.35; margin-bottom: 6px; color: #0f172a; }
    .attrs { display: flex; justify-content: space-between; gap: 4px; font-size: 8px; font-weight: 800; color: #64748b; margin-bottom: 6px; }
    .qr-wrap img { width: 28mm; height: 28mm; }
    .barcode-num { font-family: monospace; font-size: 10px; font-weight: 900; letter-spacing: 0.5px; margin: 4px 0 8px; }
    .foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    .price-box { background: #2563eb; color: #fff; border-radius: 8px; padding: 4px 8px; font-size: 11px; font-weight: 900; font-family: 'Times New Roman', serif; }
    .price-lbl { font-size: 8px; font-weight: 800; color: #94a3b8; }
  </style></head><body><div class="sheet">${cards}</div>
  <script>window.onload=function(){window.print();}</script></body></html>`;
}

export function PosLabelsTab({ activeBranchId, onSimulateScan, onMessage }: Props) {
  const { t } = useLanguage();
  const { branches } = useAuth();
  const currency = t('dashboard.currency');

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [variant, setVariant] = useState<BarcodeLabelDto | null>(null);
  const [shopName, setShopName] = useState(t('pos.smart.labels.defaultShop'));
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [printQty, setPrintQty] = useState('10');
  const [loading, setLoading] = useState(true);

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, wh] = await Promise.all([fetchProducts(), fetchWarehouses()]);
      const active = prods.filter((p) => p.is_active);
      setProducts(active);
      const preferred = wh.find((w) => w.primary_branch === activeBranchId) ?? wh[0];
      if (preferred) setWarehouseId(preferred.id);
      setProductId((prev) => prev || active[0]?.id || '');
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (activeBranch?.name_ar) setShopName(activeBranch.name_ar);
  }, [activeBranch?.name_ar]);

  useEffect(() => {
    if (!productId) {
      setVariant(null);
      return;
    }
    let cancelled = false;
    void fetchBarcodeLabels({ product: productId, warehouse: warehouseId || undefined, branch: activeBranchId })
      .then((rows) => {
        if (cancelled) return;
        const first = rows[0] ?? null;
        setVariant(first);
        if (first) {
          setCustomPrice(first.offer_price && parseFloat(first.offer_price) > 0 ? first.offer_price : first.sale_price);
          setSize(first.size_name && first.size_name !== '—' ? first.size_name : '');
          setColor(first.color_name && first.color_name !== '—' ? first.color_name : '');
        }
      })
      .catch(() => {
        if (!cancelled) setVariant(null);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, warehouseId, activeBranchId]);

  const display = useMemo(() => {
    const barcode = variant?.barcode || selectedProduct?.barcode || '';
    const productName = variant?.product_name || selectedProduct?.name_ar || '—';
    const priceNum = parseFloat(customPrice) || parseFloat(variant?.sale_price || selectedProduct?.sale_price || '0');
    const sizeText = size.trim() || t('pos.smart.labels.freeSize');
    const colorText = color.trim() || t('pos.smart.labels.defaultColor');
    return {
      barcode,
      productName,
      price: fmtPosAmount(priceNum),
      sizeText,
      colorText,
    };
  }, [variant, selectedProduct, customPrice, size, color, t]);

  const printNow = () => {
    if (!display.barcode) {
      onMessage(t('pos.smart.labels.selectProductFirst'));
      return;
    }
    const copies = Math.max(parseInt(printQty, 10) || 1, 1);
    const html = stickerPrintHtml({
      shopName,
      productName: display.productName,
      size: display.sizeText,
      color: display.colorText,
      barcode: display.barcode,
      price: display.price,
      currency,
      sizeLabel: t('pos.smart.labels.sizeShort'),
      colorLabel: t('pos.smart.labels.colorShort'),
      sellingPriceLabel: t('pos.smart.labels.sellingPrice'),
      copies,
    });
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    onMessage(t('pos.smart.labels.printStarted'));
  };

  const simulate = () => {
    if (!display.barcode) {
      onMessage(t('pos.smart.labels.selectProductFirst'));
      return;
    }
    onSimulateScan(display.barcode);
  };

  return (
    <div className="psc-labels">
      <div className="psc-labels-card">
        <header className="psc-labels-head">
          <h2>{t('pos.smart.labels.title')}</h2>
          <p>{t('pos.smart.labels.subtitle')}</p>
        </header>

        <div className="psc-labels-layout">
          <section className="psc-labels-form">
            <label className="psc-labels-field">
              {t('pos.smart.labels.pickProduct')}
              <select
                value={productId}
                disabled={loading}
                onChange={(e) => setProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_ar} ({p.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="psc-labels-field">
              {t('pos.smart.labels.shopName')}
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} />
            </label>

            <div className="psc-labels-row">
              <label className="psc-labels-field">
                {t('pos.smart.labels.sizeOpt')}
                <input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder={t('pos.smart.labels.sizePlaceholder')}
                />
              </label>
              <label className="psc-labels-field">
                {t('pos.smart.labels.colorOpt')}
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder={t('pos.smart.labels.colorPlaceholder')}
                />
              </label>
            </div>

            <div className="psc-labels-row">
              <label className="psc-labels-field">
                {t('pos.smart.labels.customPrice')}
                <input
                  type="number"
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                />
              </label>
              <label className="psc-labels-field">
                {t('pos.smart.labels.printQty')}
                <input
                  type="number"
                  min="1"
                  value={printQty}
                  onChange={(e) => setPrintQty(e.target.value)}
                />
              </label>
            </div>

            <button type="button" className="psc-labels-print-btn" onClick={printNow}>
              <Printer className="h-4 w-4" />
              {t('pos.smart.labels.printNow')}
            </button>
          </section>

          <aside className="psc-labels-preview-wrap">
            <p className="psc-labels-preview-title">{t('pos.smart.labels.previewTitle')}</p>
            <div className="psc-labels-preview-box">
              <article className="psc-sticker">
                <span className="psc-sticker-hole" aria-hidden />
                <div className="psc-sticker-shop">{shopName || '—'}</div>
                <div className="psc-sticker-name">{display.productName}</div>
                <div className="psc-sticker-attrs">
                  <span>{t('pos.smart.labels.sizeShort')}: {display.sizeText}</span>
                  <span>{t('pos.smart.labels.colorShort')}: {display.colorText}</span>
                </div>
                <div className="psc-sticker-qr">
                  {display.barcode ? (
                    <QRCodeSVG value={display.barcode} size={112} level="M" />
                  ) : (
                    <div className="psc-sticker-qr-ph" />
                  )}
                </div>
                <div className="psc-sticker-barcode">{display.barcode || '—'}</div>
                <footer className="psc-sticker-foot">
                  <div className="psc-sticker-price">
                    {display.price} {currency}
                  </div>
                  <span className="psc-sticker-price-lbl">{t('pos.smart.labels.sellingPrice')}</span>
                </footer>
              </article>
            </div>
            <button type="button" className="psc-labels-sim-btn" onClick={simulate}>
              <Zap className="h-4 w-4" />
              {t('pos.smart.labels.simulateScan')}
            </button>
          </aside>
        </div>
      </div>

      <button type="button" className="psc-buyer-btn" onClick={() => onMessage(t('pos.smart.buyerScreen'))}>
        <Smartphone className="h-3 w-3" />
        {t('pos.smart.buyerScreen')}
      </button>
    </div>
  );
}
