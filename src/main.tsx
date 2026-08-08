import './fix-fetch';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './dark-mode-professional.css';
import './responsive-shell.css';
import './mahaly-action-buttons.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { AccountFrozenModalHost } from '@/components/auth/AccountFrozenModal';
import { PremiumToastHost } from '@/components/ui/premium-toast';
import { initAccentFromStorage } from '@/lib/theme/accent';
import { initFontScaleFromStorage } from '@/lib/theme/fontScale';

initAccentFromStorage();
initFontScaleFromStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <AccountFrozenModalHost />
        <PremiumToastHost />
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
);
