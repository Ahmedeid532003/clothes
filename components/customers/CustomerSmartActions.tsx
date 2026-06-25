import React from 'react';
import { Barcode, MapPin, MessageCircle, Phone, QrCode } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

type Props = {
  code: string;
  phone?: string;
  whatsapp?: string;
  gpsLat?: string | null;
  gpsLng?: string | null;
};

function digitsOnly(v: string) {
  return v.replace(/\D/g, '');
}

export function CustomerSmartActions({ code, phone, whatsapp, gpsLat, gpsLng }: Props) {
  const { t } = useLanguage();
  const tel = digitsOnly(phone || '');
  const wa = digitsOnly(whatsapp || tel);
  const lat = gpsLat ? Number(gpsLat) : NaN;
  const lng = gpsLng ? Number(gpsLng) : NaN;
  const hasGps = !Number.isNaN(lat) && !Number.isNaN(lng);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(code)}`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 p-3 shadow-sm">
      <span className="text-xs font-bold text-indigo-900 me-1">{t('customers.smartActions')}</span>
      {hasGps ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={() =>
            window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener')
          }
        >
          <MapPin className="h-3.5 w-3.5" />
          {t('customers.openMaps')}
        </Button>
      ) : null}
      {wa ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={() => window.open(`https://wa.me/${wa}`, '_blank', 'noopener')}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {t('customers.whatsapp')}
        </Button>
      ) : null}
      {tel ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={() => {
            window.location.href = `tel:${tel}`;
          }}
        >
          <Phone className="h-3.5 w-3.5" />
          {t('customers.call')}
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1"
        title={code}
        onClick={() => window.open(qrUrl, '_blank', 'noopener')}
      >
        <QrCode className="h-3.5 w-3.5" />
        QR
      </Button>
      <span className="inline-flex items-center gap-1 rounded border bg-white px-2 py-1 font-mono text-xs">
        <Barcode className="h-3.5 w-3.5 text-slate-500" />
        {code}
      </span>
      <img src={qrUrl} alt="" className="h-10 w-10 rounded border bg-white" />
    </div>
  );
}
