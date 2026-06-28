import React, { useRef, useState } from 'react';
import { Download, FileText, IdCard, Shield, Upload, UserRound } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { employeeDataApi, type EmployeeDataRow } from '@/lib/api/employee-data';
import { mediaUrl } from '@/lib/api/media';
import { EmployeeAvatar } from '@/components/hr/employee-data/EmployeeAvatar';

type Props = {
  employeeId: string;
  fullName: string;
  photoUrl?: string | null;
  hasIdCard?: boolean;
  idCardFilename?: string;
  isAdmin: boolean;
  compact?: boolean;
  onUpdated?: (row: EmployeeDataRow) => void;
};

export function EmployeeMediaPanel({
  employeeId,
  fullName,
  photoUrl,
  hasIdCard,
  idCardFilename,
  isAdmin,
  compact = false,
  onUpdated,
}: Props) {
  const { isRtl } = useLanguage();
  const photoRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'photo' | 'id' | 'download' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  const displayPhoto = localPhoto || photoUrl;

  const handlePhoto = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading('photo');
    const preview = URL.createObjectURL(file);
    setLocalPhoto(preview);
    try {
      const row = await employeeDataApi.uploadPhoto(employeeId, file);
      onUpdated?.(row);
      setLocalPhoto(mediaUrl(row.photo_url) || preview);
    } catch (e) {
      setLocalPhoto(null);
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setUploading(null);
    }
  };

  const handleIdCard = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading('id');
    try {
      const row = await employeeDataApi.uploadIdCard(employeeId, file);
      onUpdated?.(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async () => {
    setError(null);
    setUploading('download');
    try {
      await employeeDataApi.downloadIdCard(employeeId, idCardFilename || 'id-card.pdf');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setUploading(null);
    }
  };

  return (
    <section className={`emp-media-panel ${compact ? 'is-compact' : ''}`}>
      <div className="emp-media-panel-head">
        <div>
          <h3>{isRtl ? 'الصورة الشخصية وبطاقة الهوية' : 'Photo & ID card'}</h3>
          <p>
            {isRtl
              ? 'الصورة تظهر في جدول الموظفين. بطاقة الهوية (PDF/صورة) للمدير فقط.'
              : 'Photo appears in the employee list. ID card (PDF/image) is admin-only.'}
          </p>
        </div>
      </div>

      {error ? <p className="emp-media-panel-error">{error}</p> : null}

      <div className="emp-media-panel-grid">
        <div className="emp-media-card">
          <div className="emp-media-card-icon is-photo">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="emp-media-card-body">
            <strong>{isRtl ? 'الصورة الشخصية' : 'Profile photo'}</strong>
            <EmployeeAvatar fullName={fullName} photoUrl={displayPhoto} size="lg" showDot={false} />
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                void handlePhoto(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="emp-media-upload-btn"
              disabled={uploading === 'photo'}
              onClick={() => photoRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploading === 'photo'
                ? isRtl
                  ? 'جاري الرفع...'
                  : 'Uploading...'
                : isRtl
                  ? 'رفع / تغيير الصورة'
                  : 'Upload / change photo'}
            </button>
            <small>{isRtl ? 'حد أقصى 3 ميجابايت — JPG, PNG, WEBP' : 'Max 3MB — JPG, PNG, WEBP'}</small>
          </div>
        </div>

        <div className="emp-media-card">
          <div className="emp-media-card-icon is-id">
            <IdCard className="h-5 w-5" />
          </div>
          <div className="emp-media-card-body">
            <strong>{isRtl ? 'بطاقة الهوية (PDF / صورة)' : 'National ID card (PDF / image)'}</strong>
            <div className="emp-media-id-status">
              <FileText className="h-8 w-8" />
              <span>{hasIdCard ? idCardFilename || (isRtl ? 'ملف مرفوع' : 'File uploaded') : isRtl ? 'لا يوجد ملف' : 'No file yet'}</span>
            </div>
            <input
              ref={idRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                void handleIdCard(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="emp-media-upload-btn is-secondary"
              disabled={uploading === 'id'}
              onClick={() => idRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploading === 'id'
                ? isRtl
                  ? 'جاري الرفع...'
                  : 'Uploading...'
                : isRtl
                  ? 'رفع بطاقة الهوية'
                  : 'Upload ID card'}
            </button>
            {isAdmin && hasIdCard ? (
              <button
                type="button"
                className="emp-media-download-btn"
                disabled={uploading === 'download'}
                onClick={() => void handleDownload()}
              >
                <Download className="h-4 w-4" />
                {isRtl ? 'تحميل (مدير فقط)' : 'Download (admin only)'}
              </button>
            ) : (
              <p className="emp-media-admin-note">
                <Shield className="h-3.5 w-3.5" />
                {isRtl ? 'العرض والتحميل للمدير فقط' : 'View & download: admin only'}
              </p>
            )}
            <small>{isRtl ? 'PDF أو صورة — حد أقصى 10 ميجابايت' : 'PDF or image — max 10MB'}</small>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Inline photo picker for registration (upload after employee is created). */
export function EmployeePhotoPicker({
  preview,
  onPick,
  disabled,
}: {
  preview: string | null;
  onPick: (file: File) => void;
  disabled?: boolean;
}) {
  const { isRtl } = useLanguage();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="emp-reg-photo-picker">
      <div className="emp-reg-photo-preview">
        {preview ? (
          <img src={preview} alt="" />
        ) : (
          <UserRound className="h-10 w-10 text-slate-400" />
        )}
      </div>
      <div>
        <strong>{isRtl ? 'الصورة الشخصية' : 'Profile photo'}</strong>
        <p>{isRtl ? 'اختياري — تظهر في جدول الموظفين' : 'Optional — shown in employee table'}</p>
        <input
          ref={ref}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="emp-reg-photo-btn"
          disabled={disabled}
          onClick={() => ref.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {isRtl ? 'اختيار صورة' : 'Choose photo'}
        </button>
      </div>
    </div>
  );
}

/** Inline ID card picker for registration. */
export function EmployeeIdCardPicker({
  fileName,
  onPick,
  disabled,
}: {
  fileName: string | null;
  onPick: (file: File) => void;
  disabled?: boolean;
}) {
  const { isRtl } = useLanguage();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="emp-reg-id-picker">
      <div className="emp-reg-id-icon">
        <IdCard className="h-6 w-6" />
      </div>
      <div>
        <strong>{isRtl ? 'بطاقة الهوية (PDF)' : 'ID card (PDF)'}</strong>
        <p>{fileName || (isRtl ? 'لم يُرفع ملف بعد' : 'No file selected')}</p>
        <input
          ref={ref}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="emp-reg-photo-btn is-outline"
          disabled={disabled}
          onClick={() => ref.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {isRtl ? 'رفع PDF / صورة' : 'Upload PDF / image'}
        </button>
      </div>
    </div>
  );
}
