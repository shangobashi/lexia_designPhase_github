import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';

export default function DemoPage() {
  const { continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const handleGuestAccess = () => {
    continueAsGuest();
    navigate('/chat');
  };

  const handleViewPricing = () => {
    navigate('/pricing');
  };

  // YouTube video ID extracted from the URL
  const videoId = '0F8mnGPUycY';

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'}`}>
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 ${theme === 'dark' ? 'dark-header' : 'light-header'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className={`flex items-center space-x-2 transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-slate-800'}`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="font-clash font-medium">{t.demo.back}</span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className={`w-10 h-10 flex items-center justify-center`}>
                  <img src={`${import.meta.env.BASE_URL}kingsley-logo.png`} alt="Kingsley Logo" className="w-full h-full object-contain" />
                </div>
                <span className={`font-clash text-xl font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Kingsley</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LanguageToggle />
              <button className={`font-clash text-white px-6 py-2 rounded-xl font-medium ${theme === 'dark' ? 'dark-primary-button' : 'primary-button'}`} onClick={handleGuestAccess}>
                {t.demo.getStarted}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className={`font-clash text-4xl font-light tracking-tight mb-6 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              {t.demo.title}
            </h1>
            <p className={`font-clash text-lg max-w-2xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
              {t.demo.subtitle}
            </p>
          </div>

          {/* Video Container */}
          <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-8 mb-12`}>
            <div className="relative w-full max-w-4xl mx-auto">
              {/* YouTube Video Embed */}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */}
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-xl"
                  src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`}
                  title="Kingsley Demo Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              
              {/* Video Overlay with Play Button (shown before video loads) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-20 h-20 rounded-full ${theme === 'dark' ? 'bg-slate-800/80' : 'bg-white/80'} flex items-center justify-center backdrop-blur-sm`}>
                  <Play className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} ml-1`} />
                </div>
              </div>
            </div>
          </div>

          {/* Demo Description */}
          <div className="text-center mb-12">
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-8 max-w-3xl mx-auto`}>
              <h2 className={`font-clash text-2xl font-semibold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {t.demo.fullDemo}
              </h2>
              <p className={`font-clash text-lg leading-relaxed mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                {t.demo.videoHelps}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto ${theme === 'dark' ? 'bg-slate-600/30' : 'bg-gray-100'}`}>
                    <span className={`text-2xl ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>💬</span>
                  </div>
                  <h3 className={`font-clash font-semibold mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.demo.askQuestions}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t.demo.askQuestionsDesc}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto ${theme === 'dark' ? 'bg-slate-600/30' : 'bg-gray-100'}`}>
                    <span className={`text-2xl ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>📄</span>
                  </div>
                  <h3 className={`font-clash font-semibold mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.demo.generateDocs}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t.demo.generateDocsDesc}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto ${theme === 'dark' ? 'bg-slate-600/30' : 'bg-gray-100'}`}>
                    <span className={`text-2xl ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>📁</span>
                  </div>
                  <h3 className={`font-clash font-semibold mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.demo.manageCases}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t.demo.manageCasesDesc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-8 max-w-2xl mx-auto`}>
              <h3 className={`font-clash text-2xl font-semibold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {t.demo.readyToTry}
              </h3>
              <p className={`font-clash text-lg mb-8 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                {t.demo.startTrialDesc}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  className={`font-clash text-white px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden ${theme === 'dark' ? 'dark-cta-primary' : 'light-cta-primary'}`}
                  onClick={handleGuestAccess}
                >
                  <span className="relative z-10">{t.demo.startTrial}</span>
                </button>
                <button 
                  className={`font-clash px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden ${theme === 'dark' ? 'dark-cta-secondary text-slate-200' : 'light-cta-secondary text-gray-700'}`}
                  onClick={handleViewPricing}
                >
                  <span className="relative z-10">{t.demo.viewPricing}</span>
                </button>
              </div>
              <p className={`font-clash text-sm mt-6 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                {t.demo.freeInfo}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`py-12 ${theme === 'dark' ? 'dark-footer' : 'light-footer'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className={`w-8 h-8 flex items-center justify-center`}>
                <img src={`${import.meta.env.BASE_URL}kingsley-logo.png`} alt="Kingsley Logo" className="w-full h-full object-contain" />
              </div>
              <span className={`font-clash text-lg font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Kingsley</span>
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


