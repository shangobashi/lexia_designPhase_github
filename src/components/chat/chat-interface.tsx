import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/theme-context';
import { Link } from 'react-router-dom';

export default function ChatInterface() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([
    { role: 'user', content: 'Bonjour, j\'ai une question sur le droit des contrats en Belgique.' },
    { role: 'ai', content: 'Bien sûr, je suis à votre disposition. Quelle est votre question précise sur le droit des contrats belge ?' },
    { role: 'user', content: 'Quelles sont les conditions de validité d\'un contrat ?' },
    { role: 'ai', content: 'En droit belge, un contrat est valide s\'il respecte quatre conditions essentielles :\n\n1. Le consentement des parties doit être libre et éclairé.\n\n2. Les parties doivent avoir la capacité de contracter.\n\n3. L\'objet du contrat doit être licite et déterminé ou déterminable.\n\n4. La cause du contrat doit être licite.\n\nVoulez-vous plus de détails sur l\'une de ces conditions ?' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }]);
      setInput('');
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', content: 'Réponse simulée de l\'IA.' }]);
      }, 1000);
    }
  };

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} flex`}>
      <nav className={`${theme === 'dark' ? 'dark-sidebar' : 'sidebar'}`}>
        <div className="mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg mb-2"></div>
          <h1 className="text-2xl font-bold">LexiA</h1>
        </div>
        <ul className="space-y-4">
          <li><Link to="/dashboard" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Tableau de bord</Link></li>
          <li><Link to="/cases" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Dossiers</Link></li>
          <li><Link to="/chat" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Consultation IA</Link></li>
          <li><Link to="/account" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Compte</Link></li>
          <li><Link to="/billing" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Facturation</Link></li>
        </ul>
      </nav>

      <main className="flex-1 ml-64 p-8 flex flex-col">
        <h1 className="text-3xl font-bold mb-8">Consultation IA</h1>

        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`${msg.role === 'user' ? (theme === 'dark' ? 'dark-chat-message-user' : 'chat-message-user') : (theme === 'dark' ? 'dark-chat-message-ai' : 'chat-message-ai')} `}
            >
              {msg.content}
            </div>
          ))}
        </div>

        <div className="flex space-x-2">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Posez votre question..." 
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'}`}>Envoyer</Button>
        </div>
      </main>
    </div>
  );
}
