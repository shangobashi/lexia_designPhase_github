import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, X, ExternalLink, Copy, Check } from 'lucide-react';

export function AISetupBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if any AI provider is configured
    const hasGemini = !!import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your-gemini-api-key';
    const hasGroq = !!import.meta.env.VITE_GROQ_API_KEY && import.meta.env.VITE_GROQ_API_KEY !== 'your-groq-api-key';
    const hasHuggingFace = !!import.meta.env.VITE_HUGGINGFACE_API_KEY && import.meta.env.VITE_HUGGINGFACE_API_KEY !== 'your-huggingface-api-key';
    const hasMistral = !!import.meta.env.VITE_MISTRAL_API_KEY && import.meta.env.VITE_MISTRAL_API_KEY !== 'your-mistral-api-key';
    
    // Show banner if no AI providers are configured
    const hasAnyProvider = hasGemini || hasGroq || hasHuggingFace || hasMistral;
    
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem('ai-setup-banner-dismissed');
    
    setIsVisible(!hasAnyProvider && !dismissed);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('ai-setup-banner-dismissed', 'true');
  };

  const copyApiKeyExample = () => {
    navigator.clipboard.writeText('VITE_GEMINI_API_KEY=your_api_key_here');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isVisible) return null;

  return (
    <Card className="mx-4 mb-4 border-blue-200 bg-blue-50/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-clash font-medium text-blue-900 mb-1">
              🚀 Obtenez une assistance juridique IA gratuite !
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Utilise actuellement des réponses démo. Configurez un fournisseur IA gratuit pour obtenir une vraie analyse juridique :
            </p>
            
            <div className="space-y-2 mb-3">
              <div className="text-sm">
                <strong className="text-blue-900">📍 Recommandé : Google Gemini (Complètement gratuit)</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1 text-blue-600">
                  <li>Visitez <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center">Google AI Studio <ExternalLink className="h-3 w-3 ml-1" /></a></li>
                  <li>Cliquez sur "Create API Key" → "Create API key in new project"</li>
                  <li>Copiez votre clé API</li>
                  <li>Ajoutez à votre fichier .env :</li>
                </ol>
                
                <div className="font-clash mt-2 p-2 bg-blue-100 rounded text-xs font-mono flex items-center justify-between">
                  <span>VITE_GEMINI_API_KEY=your_api_key_here</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={copyApiKeyExample}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-blue-600 space-y-1">
                <div>
                  <strong>Alternative :</strong> <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline">Groq (Gratuit & Rapide)</a> - Ajoutez <code className="bg-blue-100 px-1 rounded">VITE_GROQ_API_KEY</code>
                </div>
                <div>
                  <strong>Autres options :</strong> 
                  <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline ml-1">HuggingFace</a>, 
                  <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="underline ml-1">Mistral</a> (tous gratuits)
                </div>
              </div>
            </div>
            
            <p className="text-xs text-blue-600">
              ✨ Après avoir ajouté votre clé API, rafraîchissez la page pour activer toutes les fonctionnalités IA !
            </p>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-400 hover:text-blue-600"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
