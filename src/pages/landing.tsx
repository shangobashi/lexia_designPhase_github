import { Link, useNavigate } from 'react-router-dom';
import { HelpCircle, FileText, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';

export default function LandingPage() {
  const { continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const handleGuestAccess = () => {
    continueAsGuest();
    navigate('/chat');
  };

  const handleViewDemo = () => navigate('/demo');
  const handleViewPricing = () => navigate('/pricing');

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'}`}>
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 ${theme === 'dark' ? 'dark-header' : 'light-header'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center">
              <div className="w-11 h-11 sm:w-[60px] sm:h-[60px] flex items-center justify-center">
                <img src={`${import.meta.env.BASE_URL}kingsley-logo.png`} alt="Kingsley Logo" className="w-full h-full object-contain" />
              </div>
              <span className={`ml-2 sm:ml-3 text-lg sm:text-2xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Kingsley</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <a href="#features" className={`hidden md:inline font-clash font-medium transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-slate-800'}`}>{t.landing.nav.features}</a>
              <Link to="/pricing" className={`hidden md:inline font-clash font-medium transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-slate-800'}`}>{t.landing.nav.pricing}</Link>
              <Link to="/login" className={`hidden sm:inline font-clash font-medium transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-slate-800'}`}>{t.landing.nav.login}</Link>
              <ThemeToggle />
              <LanguageToggle />
              <button className={`hidden sm:inline-flex font-clash text-white px-4 sm:px-6 py-2 rounded-xl font-medium ${theme === 'dark' ? 'dark-primary-button' : 'primary-button'}`} onClick={handleGuestAccess}>
                {t.landing.nav.getStarted}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={`${theme === 'dark' ? 'dark-sophisticated-bg landing-document-flow' : 'light-sophisticated-bg light-book-flow'}`}>
        {/* Hero */}
        <section className="pt-32 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className={`font-clash text-4xl sm:text-5xl lg:text-6xl font-extralight tracking-tight mb-8 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {t.landing.hero.title}
                <span className={`font-clash block font-light ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.landing.hero.titleSpan}</span>
              </h1>
              <p className={`font-clash text-base sm:text-xl font-light mb-12 max-w-3xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                {t.landing.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button 
                  className={`font-clash text-white px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden ${theme === 'dark' ? 'dark-cta-primary' : 'light-cta-primary'}`}
                  onClick={handleGuestAccess}
                >
                  <span className="relative z-10">{t.landing.hero.cta}</span>
                </button>
                <button 
                  className={`font-clash px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden ${theme === 'dark' ? 'dark-cta-secondary text-slate-200' : 'light-cta-secondary text-gray-700'}`}
                  onClick={handleViewDemo}
                >
                  <span className="relative z-10">{t.landing.hero.demo}</span>
                </button>
              </div>
              <p className={`font-clash text-sm mt-6 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{t.landing.hero.freeInfo}</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className={`text-center p-8 rounded-2xl ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
                <div className={`font-clash text-4xl font-light mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>500+</div>
                <div className={`font-clash font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.landing.stats.activeUsers}</div>
              </div>
              <div className={`text-center p-8 rounded-2xl ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
                <div className={`font-clash text-4xl font-light mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>10k+</div>
                <div className={`font-clash font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.landing.stats.questionsProcessed}</div>
              </div>
              <div className={`text-center p-8 rounded-2xl ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
                <div className={`font-clash text-4xl font-light mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>&lt;30s</div>
                <div className={`font-clash font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.landing.stats.responseTime}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className={`font-clash text-4xl font-light mb-6 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.landing.features.title}</h2>
              <p className={`font-clash text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                {t.landing.features.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`p-8 rounded-2xl ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-slate-600/30' : 'bg-gray-100'}`}>
                  <HelpCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`} />
                </div>
                <h3 className={`font-clash text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.landing.features.consultation.title}</h3>
                <p className={`font-clash leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                  {t.landing.features.consultation.description}
                </p>
              </div>
              <div className={`p-8 rounded-2xl ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-slate-600/30' : 'bg-gray-100'}`}>
                  <FileText className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`} />
                </div>
                <h3 className={`font-clash text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.landing.features.documents.title}</h3>
                <p className={`font-clash leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                  {t.landing.features.documents.description}
                </p>
              </div>
              <div className={`p-8 rounded-2xl ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-slate-600/30' : 'bg-gray-100'}`}>
                  <Briefcase className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`} />
                </div>
                <h3 className={`font-clash text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.landing.features.caseManagement.title}</h3>
                <p className={`font-clash leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                  {t.landing.features.caseManagement.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-12 rounded-3xl`}>
              <h2 className={`font-clash text-4xl font-light mb-6 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {t.landing.cta.title}
              </h2>
              <p className={`font-clash text-lg mb-8 max-w-2xl mx-auto ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                {t.landing.cta.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  className={`font-clash text-white px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden ${theme === 'dark' ? 'dark-cta-primary' : 'light-cta-primary'}`}
                  onClick={handleGuestAccess}
                >
                  <span className="relative z-10">{t.landing.cta.startTrial}</span>
                </button>
                <button 
                  className={`font-clash px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden ${theme === 'dark' ? 'dark-cta-secondary text-slate-200' : 'light-cta-secondary text-gray-700'}`}
                  onClick={handleViewPricing}
                >
                  <span className="relative z-10">{t.landing.cta.viewPricing}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className={`py-12 ${theme === 'dark' ? 'dark-footer' : 'light-footer'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-12 h-12 flex items-center justify-center">
                <img src={`${import.meta.env.BASE_URL}kingsley-logo.png`} alt="Kingsley Logo" className="w-full h-full object-contain" />
              </div>
              <span className={`font-clash text-xl font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Kingsley</span>
            </div>
            <div className={`flex space-x-6 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
              <a href="#" className={`font-clash transition-colors ${theme === 'dark' ? 'hover:text-slate-100' : 'hover:text-slate-800'}`}>{t.common.conditions}</a>
              <a href="#" className={`font-clash transition-colors ${theme === 'dark' ? 'hover:text-slate-100' : 'hover:text-slate-800'}`}>{t.common.privacy}</a>
              <a href="#" className={`font-clash transition-colors ${theme === 'dark' ? 'hover:text-slate-100' : 'hover:text-slate-800'}`}>{t.common.support}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
