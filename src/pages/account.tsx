import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/hooks/use-toast';

export default function AccountPage() {
  const { user, updateProfile, logout, loading } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-muted-foreground">Chargement du compte...</span>
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
        title: 'Type de fichier invalide',
        description: 'Veuillez sélectionner une image (JPG, PNG, GIF, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale autorisée est de 5 Mo',
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
        title: 'Photo de profil mise à jour',
        description: 'Votre photo de profil a été mise à jour avec succès',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Échec de la mise à jour',
        description: error.message || 'Impossible de mettre à jour la photo de profil',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      setProfilePicture(null);
      await updateProfile({ photoURL: null });

      toast({
        title: 'Photo de profil supprimée',
        description: 'Votre photo de profil a été supprimée',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Échec de la suppression',
        description: error.message || 'Impossible de supprimer la photo de profil',
        variant: 'destructive',
      });
    }
  };
  
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateProfile({ displayName: name });
      toast({
        title: 'Profil mis à jour',
        description: 'Les informations de votre profil ont été mises à jour',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Échec de la mise à jour',
        description: error.message || 'Échec de la mise à jour du profil',
        variant: 'destructive',
      });
    }
  };
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Les mots de passe ne correspondent pas',
        description: 'Votre nouveau mot de passe et la confirmation doivent correspondre',
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
        title: 'Mot de passe mis à jour',
        description: 'Votre mot de passe a été modifié avec succès',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Échec du changement de mot de passe',
        description: error.message || 'Échec de la mise à jour du mot de passe',
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
    <div className="min-h-screen sophisticated-bg">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 sidebar fixed h-full z-40">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-clash font-semibold text-sm">L</span>
              </div>
              <span className="text-xl font-clash font-light text-slate-800">Kingsley</span>
            </div>
            
            <nav className="space-y-2">
              <Link to="/dashboard" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
                </svg>
                <span className="font-clash font-medium">Tableau de bord</span>
              </Link>
              
              <a href="#" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <span className="font-clash font-medium">Nouveau dossier</span>
              </a>
              
              <Link to="/cases" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <span className="font-clash font-medium">Dossiers</span>
              </Link>
              
              <a href="#" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span className="font-clash font-medium">Documents</span>
              </a>
              
              <Link to="/billing" className={`sidebar-item flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
                <span className="font-clash font-medium">Facturation</span>
              </Link>
              
              <Link to="/account" className={`sidebar-item active flex items-center space-x-3 px-4 py-3 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span className="font-clash font-medium">Paramètres</span>
              </Link>
            </nav>
          </div>
          
          <div className="absolute bottom-6 left-6 right-6">
            <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-600/30' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${theme === 'dark' ? 'bg-slate-600/50' : 'bg-gray-300'} rounded-full`}></div>
                <div>
                  <div className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>{user?.displayName || 'Invité'}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Gratuit</div>
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
                <h1 className={`text-2xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Paramètres du compte</h1>
                <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Gérez vos informations personnelles et préférences</p>
              </div>
            </div>
          </header>

          {/* Account Settings Content */}
          <main className={`p-6 ${theme === 'dark' ? 'dark-bg' : 'bg-gray-50'}`}>
            {/* Profile Information */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 mb-8`}>
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>Informations du profil</h2>
              
              <div className="flex items-start space-x-6 mb-6">
                <div className="flex-shrink-0">
                  <div className={`w-20 h-20 ${theme === 'dark' ? 'bg-slate-600/50' : 'bg-gray-300'} rounded-full flex items-center justify-center`}>
                    <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <button className={`mt-2 text-sm ${theme === 'dark' ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-gray-800'} underline`}>Changer</button>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>Prénom</label>
                    <input type="text" value="Invité" className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>Nom</label>
                    <input type="text" value="" placeholder="Non renseigné" className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>Email</label>
                    <input type="email" value="guest@kingsley.com" className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>Téléphone</label>
                    <input type="tel" value="" placeholder="Non renseigné" className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>Cabinet/Entreprise</label>
                  <input type="text" value="" placeholder="Non renseigné" className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>Fonction</label>
                  <input type="text" value="" placeholder="Non renseigné" className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} />
                </div>
              </div>
              
              <div className="mb-6">
                <label className={`block text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-2`}>Adresse</label>
                <textarea rows={3} className={`${theme === 'dark' ? 'dark-form-input' : 'form-input'} w-full px-3 py-2 rounded-lg focus:outline-none`} defaultValue="Rue de la Loi 123, 1000 Bruxelles, Belgique"></textarea>
              </div>
              
              <div className="flex justify-end">
                <button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-6 py-2 rounded-xl font-clash font-medium`}>
                  Sauvegarder les modifications
                </button>
              </div>
            </div>

            {/* Security Settings */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 mb-8`}>
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>Sécurité</h2>
              
              <div className="space-y-6">
                <div className={`${theme === 'dark' ? 'dark-setting-card' : 'setting-card'} rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Mot de passe</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Dernière modification le 15 juin 2024</p>
                    </div>
                    <button className={`px-4 py-2 border ${theme === 'dark' ? 'border-slate-600/50 text-slate-200 hover:bg-slate-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-lg transition-colors`}>
                      Modifier
                    </button>
                  </div>
                </div>
                
                <div className={`${theme === 'dark' ? 'dark-setting-card' : 'setting-card'} rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Authentification à deux facteurs</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Sécurisez votre compte avec 2FA</p>
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
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Sessions actives</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Gérez vos connexions actives</p>
                    </div>
                    <button className={`px-4 py-2 border ${theme === 'dark' ? 'border-slate-600/50 text-slate-200 hover:bg-slate-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-lg transition-colors`}>
                      Voir les sessions
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 mb-8`}>
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>Préférences de notification</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-md font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Notifications par email</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Recevoir des notifications importantes par email</p>
                  </div>
                  <label className={`${theme === 'dark' ? 'dark-toggle-switch' : 'toggle-switch'}`}>
                    <input type="checkbox" defaultChecked />
                    <span className={`${theme === 'dark' ? 'dark-slider' : 'slider'}`}></span>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-md font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Rappels d'échéances</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Alertes pour les dates limites importantes</p>
                  </div>
                  <label className={`${theme === 'dark' ? 'dark-toggle-switch' : 'toggle-switch'}`}>
                    <input type="checkbox" defaultChecked />
                    <span className={`${theme === 'dark' ? 'dark-slider' : 'slider'}`}></span>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-md font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Mises à jour produit</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Informations sur les nouvelles fonctionnalités</p>
                  </div>
                  <label className={`${theme === 'dark' ? 'dark-toggle-switch' : 'toggle-switch'}`}>
                    <input type="checkbox" />
                    <span className={`${theme === 'dark' ? 'dark-slider' : 'slider'}`}></span>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-md font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Notifications marketing</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Offres spéciales et conseils juridiques</p>
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
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>Gestion des données</h2>
              
              <div className="space-y-6">
                <div className={`${theme === 'dark' ? 'dark-setting-card' : 'setting-card'} rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Exporter mes données</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Télécharger toutes vos données personnelles</p>
                    </div>
                    <button className={`px-4 py-2 border ${theme === 'dark' ? 'border-slate-600/50 text-slate-200 hover:bg-slate-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-lg transition-colors`}>
                      Exporter
                    </button>
                  </div>
                </div>
                
                <div className={`${theme === 'dark' ? 'dark-setting-card' : 'setting-card'} rounded-xl p-4 ${theme === 'dark' ? 'border-red-600/30' : 'border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-clash font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>Supprimer mon compte</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Action irréversible - toutes vos données seront supprimées</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className={`px-4 py-2 border ${theme === 'dark' ? 'border-red-600/50 text-red-200 hover:bg-red-900/20' : 'border-red-300 text-red-700 hover:bg-red-50'} rounded-lg transition-colors`}
                    >
                      Supprimer
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