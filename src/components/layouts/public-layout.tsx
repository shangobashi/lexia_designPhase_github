import { ReactNode } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center space-x-2">
              <img src={`${import.meta.env.BASE_URL}owl-logo.png`} alt="LexiA Logo" className="h-8 w-8 object-contain" />
              <span className="text-2xl font-bold text-foreground">LexiA</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/login">Se connecter</Link>
              </Button>
              <Button asChild>
                <Link to="/register">S'inscrire</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}