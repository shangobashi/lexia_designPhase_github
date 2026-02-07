import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';

export default function AccountPage() {
  const { user, updateProfile, logout, loading } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { t } = useLanguage();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-muted-foreground">{t.account.loadingAccount}</span>
      </div>
    );
  }
  
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.photoURL || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Notification toggles state
  const [notifications, setNotifications] = useState({
    'Mises à jour des dossiers': true,
    'Nouveaux messages': true,
    'Facturation et paiement': true,
    'Notifications système': true,
  });

  const handleToggle = (key: string) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.account.toasts.invalidFileType,
        description: t.account.toasts.invalidFileTypeDesc,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.account.toasts.fileTooLarge,
        description: t.account.toasts.fileTooLargeDesc,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create a local URL for preview
      const imageUrl = URL.createObjectURL(file);
      setProfilePicture(imageUrl);

      // In a real implementation, you would upload to your storage service
      // For now, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateProfile({ photoURL: imageUrl });

      toast({
        title: t.account.toasts.photoUpdated,
        description: t.account.toasts.photoUpdatedDesc,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: t.account.toasts.updateFailed,
        description: error.message || t.account.toasts.updateFailedDesc,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      setProfilePicture(null);
      await updateProfile({ photoURL: null });

      toast({
        title: t.account.toasts.photoRemoved,
        description: t.account.toasts.photoRemovedDesc,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: t.account.toasts.removeFailed,
        description: error.message || t.account.toasts.removeFailedDesc,
        variant: 'destructive',
      });
    }
  };
  
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateProfile({ displayName: name });
      toast({
        title: t.account.toasts.profileUpdated,
        description: t.account.toasts.profileUpdatedDesc,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: t.account.toasts.updateFailed,
        description: error.message || t.account.toasts.profileUpdateFailed,
        variant: 'destructive',
      });
    }
  };
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: t.account.toasts.passwordMismatch,
        description: t.account.toasts.passwordMismatchDesc,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Simulate password change
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: t.account.toasts.passwordUpdated,
        description: t.account.toasts.passwordUpdatedDesc,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: t.account.toasts.passwordFailed,
        description: error.message || t.account.toasts.passwordFailedDesc,
        variant: 'destructive',
      });
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'}`}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`w-64 ${theme === 'dark' ? 'dark-sidebar' : 'sidebar'} fixed h-full z-40`}>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className={`w-8 h-8 ${theme === 'dark' ? 'bg-slate-200' : 'bg-gray-700'} rounded-lg flex items-center justify-center`}>
                <span className={`font-clash font-semibold text-sm ${theme === 'dark' ? 'text-gray-800' : 'text-white'}`}>L</span>
              </div>
              <span className={`text-xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Kingsley</span>
            </div>
            
            <nav className="space-y-2">
              <Link to="/dashboard" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
                </svg>
                <span className="font-clash font-medium">{t.sidebar.dashboard}</span>
              </Link>
              
              <a href="#" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <span className="font-clash font-medium">{t.sidebar.newCase}</span>
              </a>
              
              <Link to="/cases" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <span className="font-clash font-medium">{t.sidebar.cases}</span>
              </Link>
              
              <a href="#" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span className="font-clash font-medium">{t.sidebar.documents}</span>
              </a>
              
              <Link to="/billing" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
                <span className="font-clash font-medium">{t.sidebar.billing}</span>
              </Link>
              
              <Link to="/account" className={`sidebar-item active flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span className="font-clash font-medium">{t.sidebar.settings}</span>
              </Link>
            </nav>
          </div>
          
          <div className="absolute bottom-6 left-6 right-6">
            <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-600/30' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${theme === 'dark' ? 'bg-slate-600/50' : 'bg-gray-300'} rounded-full`}></div>
                <div>
                  <div className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>{user?.displayName || t.common.guest}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{t.common.free}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          {/* Header */}
          <header className={`${theme === 'dark' ? 'dark-header' : 'bg-white/80 backdrop-blur-md border-b border-gray-200/50'} px-6 py-4`}>
            <div className="flex justify-between items-center">
              <div>
                <h1 className={`text-2xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.account.title}</h1>
                <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.subtitle}</p>
              </div>
            </div>
          </header>

          {/* Account Settings Content */}
          <main className={`p-6 ${theme === 'dark' ? 'dark-bg' : 'bg-gray-50'}`}>
            {/* Profile Information */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 mb-8`}>
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>{t.account.profileInfo.title}</h2>
              
              <div className="flex items-start space-x-6 mb-6">
                <div className="flex-shrink-0">
                  <div className={`w-20 h-20 ${theme === 'dark' ? 'bg-slate-600/50' : 'bg-gray-300'} rounded-full flex items-center justify-center`}>
                    <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <button className={`mt-2 text-sm ${theme === 'dark' ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-gray-800'} underline`}>{t.account.profileInfo.change}</button>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>{t.account.profileInfo.firstName}</label>
                    <input type="text" value={t.common.guest} className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>{t.account.profileInfo.lastName}</label>
                    <input type="text" value="" placeholder={t.account.profileInfo.notProvided} className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>{t.account.profileInfo.email}</label>
                    <input type="email" value="guest@kingsley.com" className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>{t.account.profileInfo.phone}</label>
                    <input type="tel" value="" placeholder={t.account.profileInfo.notProvided} className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>{t.account.profileInfo.company}</label>
                  <input type="text" value="" placeholder={t.account.profileInfo.notProvided} className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>{t.account.profileInfo.role}</label>
                  <input type="text" value="" placeholder={t.account.profileInfo.notProvided} className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                </div>
              </div>
              
              <div className="mb-6">
                <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>{t.account.profileInfo.address}</label>
                <textarea rows={3} className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} defaultValue={t.account.profileInfo.defaultAddress}></textarea>
              </div>
              
              <div className="flex justify-end">
                <button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-6 py-2 rounded-xl font-clash font-medium`}>
                  {t.account.profileInfo.saveChanges}
                </button>
              </div>
            </div>

            {/* Security Settings */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 mb-8`}>
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>{t.account.security.title}</h2>
              
              <div className="space-y-6">
                <div className={`${theme === 'dark' ? 'dark-setting-card' : 'setting-card'} rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.account.security.password}</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.security.lastChanged}</p>
                    </div>
                    <button className={`px-4 py-2 border ${theme === 'dark' ? 'border-slate-600/50 text-slate-200 hover:bg-slate-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-lg transition-colors`}>
                      {t.common.edit}
                    </button>
                  </div>
                </div>
                
                <div className={`${theme === 'dark' ? 'dark-setting-card' : 'setting-card'} rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.account.security.twoFactor}</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.security.twoFactorDesc}</p>
                    </div>
                    <label className={`${theme === 'dark' ? 'dark-toggle-switch' : 'toggle-switch'}`}>
                      <input type="checkbox" />
                      <span className={`${theme === 'dark' ? 'dark-slider' : 'slider'}`}></span>
                    </label>
                  </div>
                </div>
                
                <div className={`${theme === 'dark' ? 'dark-setting-card' : 'setting-card'} rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.account.security.activeSessions}</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.security.activeSessionsDesc}</p>
                    </div>
                    <button className={`px-4 py-2 border ${theme === 'dark' ? 'border-slate-600/50 text-slate-200 hover:bg-slate-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-lg transition-colors`}>
                      {t.account.security.viewSessions}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 mb-8`}>
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>{t.account.notifications.title}</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-md font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.account.notifications.emailNotif}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.notifications.emailNotifDesc}</p>
                  </div>
                  <label className={`${theme === 'dark' ? 'dark-toggle-switch' : 'toggle-switch'}`}>
                    <input type="checkbox" defaultChecked />
                    <span className={`${theme === 'dark' ? 'dark-slider' : 'slider'}`}></span>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-md font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.account.notifications.deadlineReminders}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.notifications.deadlineRemindersDesc}</p>
                  </div>
                  <label className={`${theme === 'dark' ? 'dark-toggle-switch' : 'toggle-switch'}`}>
                    <input type="checkbox" defaultChecked />
                    <span className={`${theme === 'dark' ? 'dark-slider' : 'slider'}`}></span>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-md font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.account.notifications.productUpdates}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.notifications.productUpdatesDesc}</p>
                  </div>
                  <label className={`${theme === 'dark' ? 'dark-toggle-switch' : 'toggle-switch'}`}>
                    <input type="checkbox" />
                    <span className={`${theme === 'dark' ? 'dark-slider' : 'slider'}`}></span>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-md font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.account.notifications.marketingNotif}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.notifications.marketingNotifDesc}</p>
                  </div>
                  <label className={`${theme === 'dark' ? 'dark-toggle-switch' : 'toggle-switch'}`}>
                    <input type="checkbox" />
                    <span className={`${theme === 'dark' ? 'dark-slider' : 'slider'}`}></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6`}>
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>{t.account.dataManagement.title}</h2>
              
              <div className="space-y-6">
                <div className={`${theme === 'dark' ? 'dark-setting-card' : 'setting-card'} rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.account.dataManagement.exportData}</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.dataManagement.exportDataDesc}</p>
                    </div>
                    <button className={`px-4 py-2 border ${theme === 'dark' ? 'border-slate-600/50 text-slate-200 hover:bg-slate-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-lg transition-colors`}>
                      {t.account.dataManagement.exportButton}
                    </button>
                  </div>
                </div>
                
                <div className={`${theme === 'dark' ? 'dark-setting-card' : 'setting-card'} rounded-xl p-4 ${theme === 'dark' ? 'border-red-600/30' : 'border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>{t.account.dataManagement.deleteAccount}</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{t.account.dataManagement.deleteAccountDesc}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className={`px-4 py-2 border ${theme === 'dark' ? 'border-red-600/50 text-red-200 hover:bg-red-900/20' : 'border-red-300 text-red-700 hover:bg-red-50'} rounded-lg transition-colors`}
                    >
                      {t.account.dataManagement.deleteButton}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}