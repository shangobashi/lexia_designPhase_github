import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { Link } from 'react-router-dom';

export default function PricingPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} py-10 sm:py-16`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section - Apple's calming breathing space */}
        <div className="text-center mb-16 sm:mb-24">
          {/* Main Title - Bold emphasis with perfect spacing */}
          <h1 className={`font-clash text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 sm:mb-8 tracking-tight leading-none ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
            {t.pricing.title}
          </h1>
          
          {/* Subtitle - Supporting information with generous breathing room */}
          <div className="max-w-3xl mx-auto">
            <p className={`font-clash text-base sm:text-xl font-light leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
              {t.pricing.subtitle}
            </p>
          </div>
        </div>
        
        {/* Pricing Grid - Perfect Alignment with Apple's serene spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-16 sm:mb-24 max-w-7xl mx-auto">
          {/* Free Plan */}
          <div className={`relative flex flex-col p-6 sm:p-8 rounded-3xl transition-all duration-500 hover:scale-[1.02] ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
            {/* Tier Badge - Consistent height */}
            <div className="flex justify-center mb-8 h-12">
              <div className={`font-clash px-6 py-3 rounded-2xl text-sm font-medium tracking-wide flex items-center ${
                theme === 'dark' 
                  ? 'bg-slate-600/40 text-slate-300 border border-slate-500/30' 
                  : 'bg-gray-200/80 text-gray-600 border border-gray-300/50'
              }`}>
                {t.pricing.free.badge}
              </div>
            </div>

            {/* Plan Title - Consistent height and spacing */}
            <div className="h-16 flex items-center justify-center mb-8">
              <h3 className={`font-clash text-2xl font-semibold text-center tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {t.pricing.free.name}
              </h3>
            </div>
            
            {/* Price - Consistent height and spacing */}
            <div className={`text-center mb-12 h-20 flex items-center justify-center ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              <div className="flex items-baseline justify-center">
                <span className="font-clash text-5xl font-light tracking-tight">0€</span>
                <span className={`font-clash text-lg font-medium ml-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>/mois</span>
              </div>
            </div>
            
            {/* Features - Fixed height container for consistent alignment */}
            <div className="flex-grow min-h-[200px]">
              <ul className={`space-y-5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-400/60' : 'bg-gray-400/60'}`}></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.free.questions}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-400/60' : 'bg-gray-400/60'}`}></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.free.basicConsultation}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-400/60' : 'bg-gray-400/60'}`}></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.free.emailSupport}</span>
                </li>
              </ul>
            </div>
            
            {/* Action Button - Consistent height and styling */}
            <div className="mt-8 h-16">
              <Link 
                to="/register"
                className={`font-clash block w-full text-center py-4 px-8 rounded-2xl font-semibold text-base leading-none tracking-wide transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg h-full flex items-center justify-center ${
                  theme === 'dark' 
                    ? 'bg-slate-600/80 text-slate-100 hover:bg-slate-500/90 border border-slate-500/50' 
                    : 'bg-gray-200/90 text-gray-700 hover:bg-gray-300/90 border border-gray-300/60'
                }`}
              >
                {t.pricing.free.cta}
              </Link>
            </div>
          </div>

          {/* Professional Plan - Hero Element with perfect alignment */}
          <div className={`relative flex flex-col p-6 sm:p-8 rounded-3xl transition-all duration-500 hover:scale-[1.02] border-2 ${
            theme === 'dark' 
              ? 'dark-executive-card border-blue-400/60 shadow-blue-500/20 shadow-2xl' 
              : 'executive-card border-blue-400/60 shadow-blue-500/20 shadow-2xl'
          }`}>
            {/* Tier Badge - Consistent height with hero emphasis */}
            <div className="flex justify-center mb-8 h-12">
              <div className="font-clash px-8 py-3 rounded-2xl text-sm font-semibold tracking-wide bg-blue-500 text-white border border-blue-400 shadow-xl transform hover:scale-105 transition-transform duration-200 flex items-center">
                {t.pricing.professional.badge}
              </div>
            </div>
            
            {/* Plan Title - Consistent height and spacing */}
            <div className="h-16 flex items-center justify-center mb-8">
              <h3 className={`font-clash text-2xl font-semibold text-center tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {t.pricing.professional.name}
              </h3>
            </div>
            
            {/* Price - Consistent height with subtle emphasis */}
            <div className={`text-center mb-12 h-20 flex items-center justify-center ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              <div className="flex items-baseline justify-center">
                <span className="font-clash text-5xl font-light tracking-tight">49€</span>
                <span className={`font-clash text-lg font-medium ml-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>/mois</span>
              </div>
            </div>
            
            {/* Features - Fixed height container matching other cards */}
            <div className="flex-grow min-h-[200px]">
              <ul className={`space-y-5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 bg-blue-400/80"></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.professional.unlimitedQuestions}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 bg-blue-400/80"></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.professional.docGeneration}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 bg-blue-400/80"></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.professional.caseManagement}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 bg-blue-400/80"></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.professional.prioritySupport}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 bg-blue-400/80"></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.professional.apiAccess}</span>
                </li>
              </ul>
            </div>
            
            {/* Action Button - Consistent height with hero emphasis */}
            <div className="mt-8 h-16">
              <Link 
                to="/register"
                className="font-clash block w-full text-center py-4 px-8 rounded-2xl font-semibold text-base leading-none tracking-wide bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl border border-blue-400 h-full flex items-center justify-center shadow-2xl"
              >
                {t.pricing.professional.cta}
              </Link>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className={`relative flex flex-col p-6 sm:p-8 rounded-3xl transition-all duration-500 hover:scale-[1.02] ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
            {/* Tier Badge - Consistent height */}
            <div className="flex justify-center mb-8 h-12">
              <div className={`font-clash px-6 py-3 rounded-2xl text-sm font-medium tracking-wide flex items-center ${
                theme === 'dark' 
                  ? 'bg-slate-600/40 text-slate-300 border border-slate-500/30' 
                  : 'bg-gray-200/80 text-gray-600 border border-gray-300/50'
              }`}>
                {t.pricing.premium.badge}
              </div>
            </div>

            {/* Plan Title - Consistent height and spacing */}
            <div className="h-16 flex items-center justify-center mb-8">
              <h3 className={`font-clash text-2xl font-semibold text-center tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {t.pricing.premium.name}
              </h3>
            </div>
            
            {/* Price - Infinity symbol with consistent height */}
            <div className={`text-center mb-12 h-20 flex items-center justify-center ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              <div className="flex justify-center">
                <div className={`font-clash inline-block text-5xl font-extralight tracking-wide kingsley-infinity-symbol ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                  ∞
                </div>
              </div>
            </div>
            
            {/* Features - Fixed height container matching other cards */}
            <div className="flex-grow min-h-[200px]">
              <ul className={`space-y-5 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-400/60' : 'bg-gray-400/60'}`}></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.premium.everything}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-400/60' : 'bg-gray-400/60'}`}></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.premium.customIntegration}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-400/60' : 'bg-gray-400/60'}`}></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.premium.teamTraining}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-400/60' : 'bg-gray-400/60'}`}></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.premium.dedicatedSupport}</span>
                </li>
                <li className="flex items-start space-x-4 min-h-[24px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-400/60' : 'bg-gray-400/60'}`}></span>
                  <span className="font-clash text-sm font-light leading-relaxed">{t.pricing.premium.sla}</span>
                </li>
              </ul>
            </div>
            
            {/* Action Button - Consistent height and styling */}
            <div className="mt-8 h-16">
              <button className={`font-clash w-full py-4 px-8 rounded-2xl font-semibold text-base leading-none tracking-wide transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg h-full flex items-center justify-center ${
                theme === 'dark' 
                  ? 'bg-slate-600/80 text-slate-100 hover:bg-slate-500/90 border border-slate-500/50' 
                  : 'bg-gray-200/90 text-gray-700 hover:bg-gray-300/90 border border-gray-300/60'
              }`}>
                {t.pricing.premium.cta}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation - Apple's generous breathing space */}
        <div className="text-center mt-12 sm:mt-24">
          <Link 
            to="/"
            className={`font-clash inline-flex items-center font-medium text-lg tracking-wide transition-all duration-300 hover:scale-105 ${
              theme === 'dark' 
                ? 'text-slate-300 hover:text-slate-100' 
                : 'text-gray-600 hover:text-slate-800'
            }`}
          >
            {t.pricing.backToHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
