import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './lib/fonts.css';
import './index.css';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/auth-context';
import { ThemeProvider } from './contexts/theme-context';
import { LanguageProvider } from './contexts/language-context';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <App />
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>
);