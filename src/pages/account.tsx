import { useTheme } from '@/contexts/theme-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function BillingPage() {
  const { theme } = useTheme();

  const payments = [
    { date: '10 juillet 2024', amount: '99€', status: 'Payé' },
    { date: '10 juin 2024', amount: '99€', status: 'Payé' },
    { date: '10 mai 2024', amount: '99€', status: 'Payé' },
  ];

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

      <main className="flex-1 ml-64 p-8">
        <h1 className="text-3xl font-bold mb-8">Facturation</h1>

        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} mb-8 p-6`}>
          <h2 className="text-2xl font-bold mb-4">Plan actuel</h2>
          <p className="mb-2">Plan actuel: Premium</p>
          <p className="mb-2">Crédits restants: Illimité</p>
          <p className="mb-4">Renouvellement: 15 août 2024</p>
          <Button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'}`}>Changer de plan</Button>
        </div>

        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} mb-8 p-6`}>
          <h2 className="text-2xl font-bold mb-4">Historique des paiements</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => (
                <TableRow key={index}>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>{payment.amount}</TableCell>
                  <TableCell>{payment.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-6`}>
          <h2 className="text-2xl font-bold mb-4">Méthode de paiement</h2>
          <p className="mb-4">Visa **** 4242</p>
          <Button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'}`}>Changer la méthode</Button>
        </div>
      </main>
    </div>
  );
}
