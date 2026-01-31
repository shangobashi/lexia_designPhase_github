import { Theme } from '@/contexts/theme-context';

/**
 * Utility for managing theme-based class names
 * Reduces repetition and improves maintainability
 */
export const createThemeClasses = (theme: Theme) => ({
  // Background classes
  bg: {
    main: theme === 'dark' ? 'dark-bg' : 'sophisticated-bg',
    secondary: theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50',
    card: theme === 'dark' ? 'dark-executive-card' : 'executive-card',
    sidebar: theme === 'dark' ? 'dark-sidebar' : 'sidebar',
    header: theme === 'dark' ? 'dark-header' : 'bg-white/80 backdrop-blur-md border-b border-gray-200/50',
    input: theme === 'dark' ? 'dark-form-input' : 'form-input',
  },
  
  // Text classes
  text: {
    primary: theme === 'dark' ? 'text-slate-100' : 'text-slate-800',
    secondary: theme === 'dark' ? 'text-slate-300' : 'text-gray-600',
    muted: theme === 'dark' ? 'text-slate-400' : 'text-gray-500',
    sidebar: theme === 'dark' ? 'text-slate-200' : 'text-gray-700',
    sidebarInactive: theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700',
  },
  
  // Border classes
  border: {
    primary: theme === 'dark' ? 'border-slate-600/30' : 'border-gray-200',
    secondary: theme === 'dark' ? 'border-slate-600/50' : 'border-gray-300',
    table: theme === 'dark' ? 'border-slate-600/30' : 'border-gray-200',
    divider: theme === 'dark' ? 'divide-slate-600/20' : 'divide-gray-100',
  },
  
  // Button classes
  button: {
    primary: theme === 'dark' ? 'dark-primary-button' : 'primary-button',
    secondary: theme === 'dark' ? 'dark-secondary-button' : 'border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  
  // Component-specific classes
  components: {
    statCard: theme === 'dark' ? 'dark-stat-card' : 'stat-card',
    caseCard: theme === 'dark' ? 'dark-case-card' : 'case-card',
    pricingCard: theme === 'dark' ? 'dark-pricing-card' : 'pricing-card',
    settingCard: theme === 'dark' ? 'dark-setting-card' : 'setting-card',
    toggleSwitch: theme === 'dark' ? 'dark-toggle-switch' : 'toggle-switch',
    slider: theme === 'dark' ? 'dark-slider' : 'slider',
    progressBar: theme === 'dark' ? 'dark-progress-bar' : 'progress-bar',
  },
  
  // Status classes
  status: {
    success: theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700',
    warning: theme === 'dark' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    error: theme === 'dark' ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700',
    info: theme === 'dark' ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700',
  },
  
  // Logo/brand classes
  brand: {
    logoBox: theme === 'dark' ? 'bg-slate-200' : 'bg-gray-700',
    logoText: theme === 'dark' ? 'text-gray-800' : 'text-white',
  },
  
  // Avatar/user classes
  avatar: {
    background: theme === 'dark' ? 'bg-slate-600/50' : 'bg-gray-300',
    border: theme === 'dark' ? 'border-slate-600/30' : 'border-gray-200',
  },
});

/**
 * Helper function to get theme classes with fallback
 */
export const getThemeClass = (theme: Theme, category: string, variant: string): string => {
  const classes = createThemeClasses(theme);
  const categoryClasses = classes[category as keyof typeof classes] as Record<string, string>;
  return categoryClasses?.[variant] || '';
};

/**
 * Conditional class utility for theme-based styling
 */
export const themeClass = (theme: Theme, lightClass: string, darkClass: string): string => {
  return theme === 'dark' ? darkClass : lightClass;
};