import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Logo } from './Logo';
import { Bell } from 'lucide-react';
import { sendTestNotification } from '../lib/expenseNotifications';

interface HeaderProps {
  activeCategory: string;
}

export function Header({ activeCategory }: HeaderProps) {
  // Usar useMemo para evitar recálculo da data a cada renderização
  const currentMonthYear = useMemo(() => format(new Date(), 'MMMM yyyy'), []);
  const [isSending, setIsSending] = useState(false);

  const handleTestNotification = async () => {
    if (isSending) return;
    
    setIsSending(true);
    try {
      const success = await sendTestNotification();
      if (success) {
        console.log('✅ Notificação de teste enviada!');
      } else {
        console.error('❌ Falha ao enviar notificação de teste');
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    } finally {
      setTimeout(() => setIsSending(false), 2000);
    }
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 bg-[#073763] h-[100px] pt-safe-top px-4 z-50">
      <div className="h-full flex items-center gap-4">
        <div className="flex items-center gap-4">
          <Logo />
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">C&A Gutters</h1>
            <p className="text-gray-300 text-base leading-tight">
              {currentMonthYear}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {/* Botão de Teste de Notificação */}
          <button
            onClick={handleTestNotification}
            disabled={isSending}
            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Testar Notificação Push"
          >
            <Bell 
              className={`w-6 h-6 text-white ${isSending ? 'animate-bounce' : ''}`}
            />
          </button>
          
          <div className="text-white text-lg font-medium">
            {activeCategory}
          </div>
        </div>
      </div>
    </header>
  );
}