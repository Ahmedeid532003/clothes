import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  CircleHelp,
  Eye,
  EyeOff,
  Globe,
  Lock,
  MessageCircle,
  Phone,
  Shirt,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { isTenantFrozenError } from '@/lib/api/errors';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const REMEMBER_KEY = 'login_remember';
const USERNAME_KEY = 'login_username';

const CAROUSEL_SLIDES = [
  {
    titleAr: 'الهندسة الذكية للمخزون ودقة المقاسات',
    titleEn: 'Smart inventory engineering & size accuracy',
    descAr:
      'تحليل ذكي وتتبع فوري للأنواع والقياسات وتوزيع المخزون عبر المواقع بدقة متناهية.',
    descEn:
      'Smart analysis and real-time tracking of types, sizes, and stock distribution across locations.',
  },
  {
    titleAr: 'مبيعات وتقسيط بلا تعقيد',
    titleEn: 'Sales & installments without friction',
    descAr: 'نقطة بيع سريعة، أقساط العملاء، وعمولات البائعين في منصة واحدة متكاملة.',
    descEn: 'Fast POS, customer installments, and seller commissions in one integrated platform.',
  },
  {
    titleAr: 'قرارات مبنية على أرقام حقيقية',
    titleEn: 'Decisions backed by real numbers',
    descAr: 'تقارير مالية ومخزون وموارد بشرية تمنحك رؤية تنفيذية لحظية لكل الفروع.',
    descEn: 'Financial, inventory, and HR reports with instant executive visibility across branches.',
  },
];

const SUPPORT_NUMBER = '01550099556';
const WHATSAPP_LINK = 'https://wa.me/201550099556';
const PHONE_LINK = 'tel:+201550099556';

function LoginSupportModal({ open, onClose, isRtl }: { open: boolean; onClose: () => void; isRtl: boolean }) {
  if (!open) return null;

  return (
    <div className="login-support-backdrop" onClick={onClose} role="presentation">
      <div
        className="login-support-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-support-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="login-support-head">
          <button type="button" className="login-support-close" onClick={onClose} aria-label="close">
            <X className="h-5 w-5" />
          </button>
          <div className="login-support-head-title">
            <UserCheck className="h-5 w-5" />
            <h2 id="login-support-title">
              {isRtl ? 'مركز دعم مشتركين نظام محلي' : 'Mahali System subscriber support'}
            </h2>
          </div>
        </header>

        <div className="login-support-body">
          <p>
            {isRtl
              ? 'إذا واجهتك مشكلة في الدخول، يمكنك التواصل مباشرة مع مهندسي الدعم الفني لمساعدتك فوراً.'
              : 'If you have trouble signing in, contact our support engineers directly for immediate help.'}
          </p>

          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="login-support-row is-whatsapp"
          >
            <span className="login-support-row-num">{SUPPORT_NUMBER}</span>
            <span className="login-support-row-text">
              <MessageCircle className="h-4 w-4" />
              {isRtl ? 'دعم فني مباشر عبر واتساب' : 'Direct support via WhatsApp'}
            </span>
          </a>

          <a href={PHONE_LINK} className="login-support-row is-phone">
            <span className="login-support-row-num is-outline">{SUPPORT_NUMBER}</span>
            <span className="login-support-row-text">
              <Phone className="h-4 w-4" />
              {isRtl ? 'اتصال هاتفي مباشر' : 'Direct phone call'}
            </span>
          </a>
        </div>

        <footer className="login-support-foot">
          <button type="button" className="login-support-dismiss" onClick={onClose}>
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function LoginField({
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  hint,
  labelExtra,
  endAdornment,
  onClear,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  hint?: string;
  labelExtra?: React.ReactNode;
  endAdornment?: React.ReactNode;
  onClear?: () => void;
}) {
  return (
    <div className="login-mahaly-field">
      <div className="login-mahaly-field-label-row">
        <label className="login-mahaly-field-label">
          <Icon className="login-mahaly-field-label-icon" size={15} strokeWidth={2.25} />
          <span>{label}</span>
        </label>
        {labelExtra}
      </div>
      <div className="login-mahaly-input-wrap">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="login-mahaly-input"
        />
        {onClear && value ? (
          <button type="button" className="login-mahaly-input-clear" onClick={onClear} aria-label="clear">
            <X size={15} />
          </button>
        ) : null}
        {endAdornment ? <div className="login-mahaly-input-end">{endAdornment}</div> : null}
      </div>
      {hint ? <p className="login-mahaly-field-hint">{hint}</p> : null}
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const { t, isRtl, dir, locale, setLocale } = useLanguage();
  const [tenantSlug, setTenantSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [slide, setSlide] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_KEY) !== '0';
    setRemember(remembered);
    setTenantSlug(localStorage.getItem('tenant_slug') ?? '');
    if (remembered) {
      setUsername(localStorage.getItem(USERNAME_KEY) ?? '');
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((s) => (s + 1) % CAROUSEL_SLIDES.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const currentSlide = CAROUSEL_SLIDES[slide];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const slug = tenantSlug.trim().toLowerCase();
      const user = username.trim();
      await login(slug, user, password);
      localStorage.setItem('tenant_slug', slug);
      localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
      if (remember) {
        localStorage.setItem(USERNAME_KEY, user);
      } else {
        localStorage.removeItem(USERNAME_KEY);
      }
    } catch (err) {
      if (!isTenantFrozenError(err)) {
        setError(err instanceof Error ? err.message : t('auth.loginFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-mahaly" dir={dir}>
      <header className="login-mahaly-topbar">
        <div className="login-mahaly-topbar-brand">
          <span className="login-mahaly-topbar-logo" aria-hidden>
            <Shirt className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <strong>{isRtl ? 'نظام محلي' : 'Mahali System'}</strong>
            <span className="login-mahaly-status">
              <i className="login-mahaly-status-dot" aria-hidden />
              {isRtl ? 'حالة النظام: متصل وآمن' : 'System status: connected & secure'}
            </span>
          </div>
        </div>
        <div className="login-mahaly-topbar-actions">
          <button
            type="button"
            className="login-mahaly-lang-btn"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          >
            <Globe className="h-4 w-4" />
            {locale === 'ar' ? 'English' : 'العربية'}
          </button>
          <button type="button" className="login-mahaly-help-btn" onClick={() => setHelpOpen(true)}>
            <CircleHelp className="h-4 w-4" />
            {isRtl ? 'محتاج مساعدة' : 'Need help?'}
          </button>
        </div>
      </header>

      <LoginSupportModal open={helpOpen} onClose={() => setHelpOpen(false)} isRtl={isRtl} />

      <main className="login-mahaly-main">
        <div className="login-mahaly-card">
          <section className="login-mahaly-promo" aria-hidden={false}>
            <img src="/login-store.jpg" alt="" className="login-mahaly-promo-img" />
            <div className="login-mahaly-promo-overlay" />
            <div className="login-mahaly-promo-content">
              <h2>
                <BarChart3 className="h-5 w-5" />
                {isRtl ? currentSlide.titleAr : currentSlide.titleEn}
              </h2>
              <p>{isRtl ? currentSlide.descAr : currentSlide.descEn}</p>
              <div className="login-mahaly-dots">
                {CAROUSEL_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`login-mahaly-dot ${i === slide ? 'is-active' : ''}`}
                    onClick={() => setSlide(i)}
                    aria-label={`slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="login-mahaly-form-side">
            <div className="login-mahaly-form-brand">
              <span className="login-mahaly-form-logo" aria-hidden>
                <Shirt className="h-6 w-6" strokeWidth={2.25} />
              </span>
              <h1>{isRtl ? 'نظام محلي' : 'Mahali System'}</h1>
              <p>
                {isRtl
                  ? 'نظام إدارة متكامل لمحلات الملابس وتجارة التجزئة'
                  : 'Integrated management for clothing stores and retail trade'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-mahaly-form">
              <LoginField
                label={isRtl ? 'كود رمز المحل (tenant Code)' : 'Store code (tenant Code)'}
                icon={Building2}
                value={tenantSlug}
                onChange={setTenantSlug}
                placeholder={isRtl ? 'eid' : 'myshop'}
                autoComplete="organization"
                hint={
                  isRtl
                    ? 'اكتب كود المحل كما في الاشتراك — بدون مسافات أو رموز إضافية'
                    : 'Enter your store code exactly as in your subscription — no spaces or extra symbols'
                }
                onClear={() => setTenantSlug('')}
              />

              <LoginField
                label={t('auth.username')}
                icon={User}
                value={username}
                onChange={setUsername}
                placeholder={t('auth.usernamePlaceholder')}
                autoComplete="username"
              />

              <LoginField
                label={t('auth.password')}
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="current-password"
                labelExtra={
                  <button type="button" className="login-mahaly-forgot" onClick={() => setHelpOpen(true)}>
                    {t('auth.forgotPassword')}
                  </button>
                }
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="login-mahaly-password-toggle"
                    aria-label={showPassword ? 'hide password' : 'show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <label className="login-mahaly-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>{isRtl ? 'تذكر بيانات الدخول' : 'Remember login details'}</span>
              </label>

              {error ? <p className="login-mahaly-error">{error}</p> : null}

              <button type="submit" disabled={submitting} className="login-mahaly-submit">
                {submitting ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>

            <p className="login-mahaly-copyright">
              {isRtl
                ? 'جميع الحقوق محفوظة © نظام محلي لإدارة مبيعات الملابس 2025'
                : '© 2025 Mahali System for clothing retail. All rights reserved.'}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
