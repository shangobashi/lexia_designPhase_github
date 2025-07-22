import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/hooks/use-toast';
import { User, Shield, Lock, Bell, LogOut, Download, Camera } from 'lucide-react';
import * as RadixSwitch from '@radix-ui/react-switch';

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
    <div className="p-6 sophisticated-bg dark:dark-bg min-h-screen">
      {/* Header */}
      <header className="bg-white/80 dark:dark-header backdrop-blur-md border-b border-gray-200/50 dark:border-slate-600/30 px-6 py-4 mb-6 rounded-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-light text-slate-800 dark:text-slate-100">Paramètres du compte</h1>
            <p className="text-gray-600 dark:text-slate-300">Gérez vos informations personnelles et préférences</p>
          </div>
        </div>
      </header>
      
      {/* Profile Information */}
      <div className="executive-card dark:dark-executive-card rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Informations du profil</h2>
        
        <div className="flex items-start space-x-6 mb-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-gray-300 dark:bg-slate-600/50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <button className="mt-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 underline">Changer</button>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Prénom</label>
              <input 
                type="text" 
                value={name.split(' ')[0] || ''} 
                onChange={(e) => setName(e.target.value + ' ' + (name.split(' ')[1] || ''))}
                className="form-input dark:dark-form-input w-full px-3 py-2 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Nom</label>
              <input 
                type="text" 
                value={name.split(' ')[1] || ''} 
                onChange={(e) => setName((name.split(' ')[0] || '') + ' ' + e.target.value)}
                className="form-input dark:dark-form-input w-full px-3 py-2 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="form-input dark:dark-form-input w-full px-3 py-2 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Téléphone</label>
              <input type="tel" defaultValue="+32 2 123 45 67" className="form-input dark:dark-form-input w-full px-3 py-2 rounded-lg focus:outline-none" />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Cabinet/Entreprise</label>
            <input type="text" defaultValue="Cabinet Dupont & Associés" className="form-input dark:dark-form-input w-full px-3 py-2 rounded-lg focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Fonction</label>
            <input type="text" defaultValue="Avocat associé" className="form-input dark:dark-form-input w-full px-3 py-2 rounded-lg focus:outline-none" />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Adresse</label>
          <textarea rows={3} className="form-input dark:dark-form-input w-full px-3 py-2 rounded-lg focus:outline-none" placeholder="Rue de la Loi 123, 1000 Bruxelles, Belgique" defaultValue="Rue de la Loi 123, 1000 Bruxelles, Belgique"></textarea>
        </div>
        
        <div className="flex justify-end">
          <button className="primary-button dark:dark-primary-button text-white px-6 py-2 rounded-xl font-medium">
            Sauvegarder les modifications
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="executive-card dark:dark-executive-card rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Sécurité</h2>
        
        <div className="space-y-6">
          <div className="setting-card dark:dark-setting-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Mot de passe</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">Dernière modification le 15 juin 2024</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 dark:dark-secondary-button text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                Modifier
              </button>
            </div>
          </div>
          
          <div className="setting-card dark:dark-setting-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Authentification à deux facteurs</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">Sécurisez votre compte avec 2FA</p>
              </div>
              <label className="toggle-switch dark:dark-toggle-switch">
                <input type="checkbox" />
                <span className="slider dark:dark-slider"></span>
              </label>
            </div>
          </div>
          
          <div className="setting-card dark:dark-setting-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Sessions actives</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">Gérez vos connexions actives</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 dark:dark-secondary-button text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                Voir les sessions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="executive-card dark:dark-executive-card rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Préférences de notification</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium text-slate-800 dark:text-slate-100">Notifications par email</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">Recevoir des notifications importantes par email</p>
            </div>
            <label className="toggle-switch dark:dark-toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="slider dark:dark-slider"></span>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium text-slate-800 dark:text-slate-100">Rappels d'échéances</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">Alertes pour les dates limites importantes</p>
            </div>
            <label className="toggle-switch dark:dark-toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="slider dark:dark-slider"></span>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium text-slate-800 dark:text-slate-100">Mises à jour produit</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">Informations sur les nouvelles fonctionnalités</p>
            </div>
            <label className="toggle-switch dark:dark-toggle-switch">
              <input type="checkbox" />
              <span className="slider dark:dark-slider"></span>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium text-slate-800 dark:text-slate-100">Notifications marketing</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">Offres spéciales et conseils juridiques</p>
            </div>
            <label className="toggle-switch dark:dark-toggle-switch">
              <input type="checkbox" />
              <span className="slider dark:dark-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="executive-card dark:dark-executive-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Gestion des données</h2>
        
        <div className="space-y-6">
          <div className="setting-card dark:dark-setting-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Exporter mes données</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">Télécharger toutes vos données personnelles</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 dark:dark-secondary-button text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                Exporter
              </button>
            </div>
          </div>
          
          <div className="setting-card dark:dark-danger-card dark:dark-setting-card rounded-xl p-4 border-red-200 dark:border-red-600/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-red-700 dark:text-red-300">Supprimer mon compte</h3>
                <p className="text-sm text-red-600 dark:text-red-400">Action irréversible - toutes vos données seront supprimées</p>
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 border border-red-300 dark:dark-danger-button text-red-700 dark:text-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}