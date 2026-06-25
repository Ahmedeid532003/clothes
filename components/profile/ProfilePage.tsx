import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { updateProfile } from '@/lib/api/profile';
import { getUserInitials } from '@/lib/user-display';

type ProfilePageProps = {
  onBack: () => void;
};

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayName = user?.full_name || user?.username || '';
  const initials = getUserInitials(displayName);

  React.useEffect(() => {
    if (!avatarFile && !removeAvatar) {
      setAvatarPreview(user?.avatar_url ?? null);
    }
  }, [user?.avatar_url, avatarFile, removeAvatar]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('profile.invalidImage'));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError(t('profile.imageTooLarge'));
      return;
    }
    setError(null);
    setAvatarFile(file);
    setRemoveAvatar(false);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onRemovePhoto = () => {
    setAvatarFile(null);
    setRemoveAvatar(true);
    setAvatarPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: avatarFile ?? undefined,
        remove_avatar: removeAvatar,
      });
      await refreshUser();
      setAvatarFile(null);
      setRemoveAvatar(false);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-1">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" onClick={onBack} aria-label={t('profile.back')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('profile.title')}</h1>
          <p className="text-sm text-slate-500">@{user?.username}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-white shadow-md">
              <AvatarImage src={avatarPreview ?? undefined} alt={displayName} />
              <AvatarFallback className="text-2xl font-semibold bg-blue-100 text-blue-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute bottom-0 end-0 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
              onClick={() => fileRef.current?.click()}
              aria-label={t('profile.changePhoto')}
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2 text-center sm:text-start">
            <p className="text-sm text-slate-600">{t('profile.photoHint')}</p>
            {(avatarPreview || user?.avatar_url) && (
              <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={onRemovePhoto}>
                <Trash2 className="h-4 w-4 me-1" />
                {t('profile.removePhoto')}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{t('profile.fullName')}</span>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">{t('profile.email')}</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">{t('profile.phone')}</span>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {t('profile.saved')}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            {t('profile.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? t('profile.saving') : t('profile.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
