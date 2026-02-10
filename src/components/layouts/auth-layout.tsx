import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/contexts/theme-context';

export default function AuthLayout() {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark-bg document-flow' : 'sophisticated-bg book-flow'} flex flex-col lg:flex-row`}>
      {/* Floating Icons Background - positioned away from logo area */}
      {theme === 'dark' ? (
        <>
          <div className="floating-document top-1/4 right-1/4 w-3 h-3" style={{animationDelay: '-25s'}}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-slate-400">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
          </div>
          <div className="floating-document top-3/4 right-1/3 w-3 h-3" style={{animationDelay: '-8s'}}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-slate-400">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
          </div>
        </>
      ) : (
        <>
          <div className="floating-document top-1/4 left-1/4 w-4 h-4">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-gray-500">
              <path d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.68 6.5,20.68C8.45,20.68 10.55,21.1 12,22.2C13.45,21.1 15.55,20.68 17.5,20.68C18.95,20.68 20.9,20.94 22.25,21.59C22.35,21.66 22.4,21.66 22.5,21.66C22.75,21.66 23,21.41 23,21.16V6.5C21.55,5.4 19.45,5 17.5,5C15.55,5 13.45,5.4 12,6.5C10.55,5.4 8.45,5 6.5,5Z"/>
            </svg>
          </div>
          <div className="floating-document top-2/3 right-1/3 w-3 h-3" style={{animationDelay: '-8s'}}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-gray-500">
              <path d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.68 6.5,20.68C8.45,20.68 10.55,21.1 12,22.2C13.45,21.1 15.55,20.68 17.5,20.68C18.95,20.68 20.9,20.94 22.25,21.59C22.35,21.66 22.4,21.66 22.5,21.66C22.75,21.66 23,21.41 23,21.16V6.5C21.55,5.4 19.45,5 17.5,5C15.55,5 13.45,5.4 12,6.5C10.55,5.4 8.45,5 6.5,5Z"/>
            </svg>
          </div>
        </>
      )}
      
      {/* Texture Overlay removed to prevent yellow tint */}
      
      {/* Theme Toggle */}
      <div className="fixed right-3 top-3 z-50 sm:right-6 sm:top-6">
        <div className={`${theme === 'dark' ? 'refined-icon' : 'bg-gray-100'} p-3 rounded-full shimmer`}>
          <ThemeToggle />
        </div>
      </div>
      
      {/* Left Side - Branding and Features */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-10 xl:p-16 relative z-10 ${theme === 'dark' ? 'dark-secondary-bg' : ''}`}>
        <div className="max-w-sm mx-auto text-center flex flex-col items-center">
          {/* Logo - Perfectly Centered with Creative Inheritance */}
          <div className={`mb-12 w-24 h-24 flex items-center justify-center mx-auto`}>
            <img
              src={`${import.meta.env.BASE_URL}kingsley-logo.png`}
              alt="Kingsley Logo"
              className="w-full h-full object-contain"
            />
          </div>
          
          <h1 className={`text-6xl font-clash font-medium tracking-wide mb-8 leading-none kingsley-jony-ive`}>
            Kingsley
          </h1>
          <p className={`text-lg font-clash font-light mb-16 leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            Intelligence juridique avancée
          </p>
          
          {/* Feature Cards */}
          <div className="space-y-8 text-left">
            <div className={`${theme === 'dark' ? 'paper-card' : 'bg-white border border-gray-200 shadow-lg'} p-8 rounded-2xl shimmer`}>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl ${theme === 'dark' ? 'refined-icon' : 'bg-gray-100'} flex items-center justify-center`}>
                  <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-clash font-medium mb-1 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Analyse experte</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Solutions juridiques précises</p>
                </div>
              </div>
            </div>
            
            <div className={`${theme === 'dark' ? 'paper-card' : 'bg-white border border-gray-200 shadow-lg'} p-8 rounded-2xl shimmer`} style={{animationDelay: '-2s'}}>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl ${theme === 'dark' ? 'refined-icon' : 'bg-gray-100'} flex items-center justify-center`}>
                  <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 18l-3.75-3.75 3.75-3.75m-6.75 10.5L3.75 15 7.5 11.25m13.5 0L17.25 15l3.75 3.75M9 12h6m-6 3h6m-6 3h6" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-clash font-medium mb-1 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Documents intelligents</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Rédaction automatisée</p>
                </div>
              </div>
            </div>
            
            <div className={`${theme === 'dark' ? 'paper-card' : 'bg-white border border-gray-200 shadow-lg'} p-8 rounded-2xl shimmer`} style={{animationDelay: '-4s'}}>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl ${theme === 'dark' ? 'refined-icon' : 'bg-gray-100'} flex items-center justify-center`}>
                  <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-clash font-medium mb-1 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Sécurité totale</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Confidentialité garantie</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div 
        className={`w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10 ${theme === 'dark' ? 'dark-secondary-bg' : ''}`}
        style={theme === 'dark' 
          ? {} 
          : { background: 'linear-gradient(120deg, rgba(241, 243, 244, 0.9) 0%, rgba(248, 249, 250, 0.85) 50%, rgba(255, 255, 255, 0.9) 100%)' }
        }
      >
        <div className="w-full max-w-md mt-10 sm:mt-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
