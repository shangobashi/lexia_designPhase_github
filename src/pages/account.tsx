import { useMemo, useRef, useState } from 'react';
import { Camera, Shield, Bell, Database, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { useNavigate } from 'react-router-dom';

type NotificationKey = 'email' | 'deadline' | 'product' | 'marketing';

export default function AccountPage() {
  const { user, updateProfile, logout, loading } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-muted-foreground">{t.account.loadingAccount}</span>
      </div>
    );
  }

  const initialName = (user.displayName || '').trim();
  const [firstName, setFirstName] = useState(initialName.split(' ')[0] || '');
  const [lastName, setLastName] = useState(initialName.split(' ').slice(1).join(' '));
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [address, setAddress] = useState(t.account.profileInfo.defaultAddress);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [profilePicture, setProfilePicture] = useState<string | null>(user.photoURL || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    email: true,
    deadline: true,
    product: false,
    marketing: false,
  });

  const notificationRows = useMemo(
    () => [
      {
        key: 'email' as NotificationKey,
        title: t.account.notifications.emailNotif,
        description: t.account.notifications.emailNotifDesc,
      },
      {
        key: 'deadline' as NotificationKey,
        title: t.account.notifications.deadlineReminders,
        description: t.account.notifications.deadlineRemindersDesc,
      },
      {
        key: 'product' as NotificationKey,
        title: t.account.notifications.productUpdates,
        description: t.account.notifications.productUpdatesDesc,
      },
      {
        key: 'marketing' as NotificationKey,
        title: t.account.notifications.marketingNotif,
        description: t.account.notifications.marketingNotifDesc,
      },
    ],
    [t]
  );

  const fullName = `${firstName} ${lastName}`.trim();

  const handleProfilePictureClick = () => fileInputRef.current?.click();

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t.account.toasts.invalidFileType,
        description: t.account.toasts.invalidFileTypeDesc,
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.account.toasts.fileTooLarge,
        description: t.account.toasts.fileTooLargeDesc,
        variant: 'destructive',
      });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setProfilePicture(imageUrl);

    try {
      await updateProfile({ photoURL: imageUrl });
      toast({
        title: t.account.toasts.photoUpdated,
        description: t.account.toasts.photoUpdatedDesc,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: t.account.toasts.updateFailed,
        description: error?.message || t.account.toasts.updateFailedDesc,
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
        description: error?.message || t.account.toasts.removeFailedDesc,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      await updateProfile({ displayName: fullName || user.displayName || t.common.guest });
      toast({
        title: t.account.toasts.profileUpdated,
        description: t.account.toasts.profileUpdatedDesc,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: t.account.toasts.updateFailed,
        description: error?.message || t.account.toasts.profileUpdateFailed,
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
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

    setIsSavingPassword(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
        description: error?.message || t.account.toasts.passwordFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        name: fullName || user.displayName || t.common.guest,
        email: user.email,
        phone,
        company,
        role,
        address,
      },
      notifications,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kingsley-account-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleNotification = (key: NotificationKey) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: t.common.loggedOut,
        description: t.common.loggedOutDesc,
        variant: 'success',
      });
      navigate('/login', { replace: true });
    } catch (error: any) {
      toast({
        title: t.common.logoutFailed,
        description: error?.message || t.common.logoutFailedDesc,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark-bg' : 'sophisticated-bg'} p-3 sm:p-6`}>
      <div className={`${isDark ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6 mb-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-clash font-light ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {t.account.title}
            </h1>
            <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.subtitle}</p>
          </div>
          {!user.isGuest && (
            <button
              type="button"
              onClick={handleLogout}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-clash font-medium transition-colors ${
                isDark
                  ? 'border border-slate-600 text-slate-200 hover:bg-slate-700/50'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LogOut className="h-4 w-4" />
              {t.common.logout}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <section className={`${isDark ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
          <h2 className={`mb-5 text-xl font-clash font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {t.account.profileInfo.title}
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <div className="flex w-full flex-col items-start gap-3 sm:w-auto">
                <div className="relative">
                  <div
                    className={`h-20 w-20 overflow-hidden rounded-full ${isDark ? 'bg-slate-600/50' : 'bg-gray-300'} flex items-center justify-center`}
                  >
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span className={`text-2xl font-semibold ${isDark ? 'text-slate-200' : 'text-gray-600'}`}>
                        {(fullName || user.displayName || t.common.guest).slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleProfilePictureClick}
                    className={`absolute -right-1 -bottom-1 inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                      isDark
                        ? 'border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-label={t.account.profileInfo.change}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                />

                <button
                  type="button"
                  onClick={handleRemoveProfilePicture}
                  className={`text-sm underline ${isDark ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  {t.account.profileInfo.change}
                </button>
              </div>

              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {t.account.profileInfo.firstName}
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2.5 focus:outline-none ${
                      isDark ? 'dark-form-input text-slate-100' : 'form-input'
                    }`}
                    placeholder={t.account.profileInfo.notProvided}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {t.account.profileInfo.lastName}
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2.5 focus:outline-none ${
                      isDark ? 'dark-form-input text-slate-100' : 'form-input'
                    }`}
                    placeholder={t.account.profileInfo.notProvided}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {t.account.profileInfo.email}
                  </label>
                  <input
                    value={user.email}
                    disabled
                    className={`w-full rounded-lg px-3 py-2.5 opacity-80 focus:outline-none ${
                      isDark ? 'dark-form-input text-slate-300' : 'form-input'
                    }`}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {t.account.profileInfo.phone}
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2.5 focus:outline-none ${
                      isDark ? 'dark-form-input text-slate-100' : 'form-input'
                    }`}
                    placeholder={t.account.profileInfo.notProvided}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {t.account.profileInfo.company}
                  </label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2.5 focus:outline-none ${
                      isDark ? 'dark-form-input text-slate-100' : 'form-input'
                    }`}
                    placeholder={t.account.profileInfo.notProvided}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {t.account.profileInfo.role}
                  </label>
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2.5 focus:outline-none ${
                      isDark ? 'dark-form-input text-slate-100' : 'form-input'
                    }`}
                    placeholder={t.account.profileInfo.notProvided}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                {t.account.profileInfo.address}
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full rounded-lg px-3 py-2.5 focus:outline-none ${
                  isDark ? 'dark-form-input text-slate-100' : 'form-input'
                }`}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setFirstName(initialName.split(' ')[0] || '');
                  setLastName(initialName.split(' ').slice(1).join(' '));
                  setPhone('');
                  setCompany('');
                  setRole('');
                  setAddress(t.account.profileInfo.defaultAddress);
                }}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  isDark
                    ? 'border-slate-600 text-slate-200 hover:bg-slate-700/50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className={`${isDark ? 'dark-primary-button' : 'primary-button'} rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60`}
              >
                {isSavingProfile ? t.common.loading : t.account.profileInfo.saveChanges}
              </button>
            </div>
          </form>
        </section>

        <section className={`${isDark ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
          <div className="mb-5 inline-flex items-center gap-2">
            <Shield className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`} />
            <h2 className={`text-xl font-clash font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {t.account.security.title}
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                {t.account.security.password}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`w-full rounded-lg px-3 py-2.5 focus:outline-none ${
                  isDark ? 'dark-form-input text-slate-100' : 'form-input'
                }`}
                placeholder="********"
              />
            </div>

            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                {t.account.security.newPassword}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full rounded-lg px-3 py-2.5 focus:outline-none ${
                  isDark ? 'dark-form-input text-slate-100' : 'form-input'
                }`}
                placeholder="********"
              />
            </div>

            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                {t.account.security.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-lg px-3 py-2.5 focus:outline-none ${
                  isDark ? 'dark-form-input text-slate-100' : 'form-input'
                }`}
                placeholder="********"
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={!newPassword || !confirmPassword || isSavingPassword}
                className={`${isDark ? 'dark-primary-button' : 'primary-button'} rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60`}
              >
                {isSavingPassword ? t.common.loading : t.common.save}
              </button>
            </div>
          </form>
        </section>

        <section className={`${isDark ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
          <div className="mb-5 inline-flex items-center gap-2">
            <Bell className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`} />
            <h2 className={`text-xl font-clash font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {t.account.notifications.title}
            </h2>
          </div>

          <div className="space-y-3">
            {notificationRows.map((row) => (
              <div
                key={row.key}
                className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                  isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-white/70'
                }`}
              >
                <div className="min-w-0">
                  <p className={`font-medium ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>{row.title}</p>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{row.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification(row.key)}
                  className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                    notifications[row.key]
                      ? 'bg-blue-600'
                      : isDark
                      ? 'bg-slate-600'
                      : 'bg-gray-300'
                  }`}
                  aria-pressed={notifications[row.key]}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      notifications[row.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className={`${isDark ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
          <div className="mb-5 inline-flex items-center gap-2">
            <Database className={`h-5 w-5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`} />
            <h2 className={`text-xl font-clash font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {t.account.dataManagement.title}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-white/70'}`}>
              <p className={`font-medium ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>{t.account.dataManagement.exportData}</p>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t.account.dataManagement.exportDataDesc}</p>
              <button
                type="button"
                onClick={handleExportData}
                className={`mt-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  isDark
                    ? 'border-slate-600 text-slate-200 hover:bg-slate-700/50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.account.dataManagement.exportButton}
              </button>
            </div>

            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-white/70'}`}>
              <p className={`font-medium ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>{t.common.logout}</p>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t.common.logoutHint}</p>
              <button
                type="button"
                onClick={handleLogout}
                className={`mt-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  isDark
                    ? 'border-slate-600 text-slate-200 hover:bg-slate-700/50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.common.logout}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
