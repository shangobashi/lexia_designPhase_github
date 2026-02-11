import { Outlet } from 'react-router-dom';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';

export default function AuthLayout() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark-bg dark-book-flow' : 'sophisticated-bg book-flow'} flex flex-col lg:flex-row`}>
      
      {/* Left Side - Branding and Features */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-10 xl:p-16 relative z-10 ${theme === 'dark' ? 'auth-left-pane-dark' : ''}`}>
        <div className="max-w-sm mx-auto text-center flex flex-col items-center">
          {/* Logo - Perfectly Centered with Creative Inheritance */}
          <div className={`mb-8 w-20 h-20 flex items-center justify-center mx-auto`}>
            <img
              src={`${import.meta.env.BASE_URL}kingsley-logo.png`}
              alt="Kingsley Logo"
              className="w-full h-full object-contain"
            />
          </div>
          
          <h1 className={`text-5xl font-clash font-medium tracking-wide mb-5 leading-none kingsley-jony-ive`}>
            Kingsley
          </h1>
          <p className={`text-base font-clash font-light mb-10 leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            {t.authLayout.tagline}
          </p>
          
          {/* Feature Cards */}
          <div className="space-y-5 text-left">
            <div className={`${theme === 'dark' ? 'paper-card' : 'bg-white border border-gray-200 shadow-lg'} p-6 rounded-2xl shimmer`}>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl ${theme === 'dark' ? 'refined-icon' : 'bg-gray-100'} flex items-center justify-center`}>
                  <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-clash font-medium mb-1 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.authLayout.expertAnalysis}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t.authLayout.expertAnalysisDesc}</p>
                </div>
              </div>
            </div>
            
            <div className={`${theme === 'dark' ? 'paper-card' : 'bg-white border border-gray-200 shadow-lg'} p-6 rounded-2xl shimmer`} style={{animationDelay: '-2s'}}>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl ${theme === 'dark' ? 'refined-icon' : 'bg-gray-100'} flex items-center justify-center`}>
                  <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 18l-3.75-3.75 3.75-3.75m-6.75 10.5L3.75 15 7.5 11.25m13.5 0L17.25 15l3.75 3.75M9 12h6m-6 3h6m-6 3h6" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-clash font-medium mb-1 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.authLayout.smartDocuments}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t.authLayout.smartDocumentsDesc}</p>
                </div>
              </div>
            </div>
            
            <div className={`${theme === 'dark' ? 'paper-card' : 'bg-white border border-gray-200 shadow-lg'} p-6 rounded-2xl shimmer`} style={{animationDelay: '-4s'}}>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl ${theme === 'dark' ? 'refined-icon' : 'bg-gray-100'} flex items-center justify-center`}>
                  <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-clash font-medium mb-1 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.authLayout.totalSecurity}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t.authLayout.totalSecurityDesc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div 
        className={`w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10 ${theme === 'dark' ? 'auth-right-pane-dark' : 'auth-panel-surface-light'}`}
      >
        <div className="w-full max-w-lg mt-10 sm:mt-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
