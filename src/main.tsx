import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './lib/fonts.css';
import './index.css';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/auth-context';
import { ThemeProvider } from './contexts/theme-context';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>
);