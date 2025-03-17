import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Employee {
  id: string;
  name: string;
  role?: string;
  dailyRate: number;
  daysWorked: number;
  workedDates: string[];
}

interface EmployeeReceiptProps {
  employee: Employee;
}

const EmployeeReceipt: React.FC<EmployeeReceiptProps> = ({ 
  employee
}) => {
  // Ordenar as datas trabalhadas
  const sortedDates = [...(employee.workedDates || [])].sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Calcular o total a pagar
  const totalAmount = employee.daysWorked * employee.dailyRate;

  // Função para imprimir o recibo
  const handlePrint = () => {
    window.print();
  };

  // Função para compartilhar o recibo
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Recibo - ${employee.name}`,
          text: `Recibo de pagamento para ${employee.name} no valor de R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        });
      } else {
        alert('Compartilhamento não suportado neste navegador');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 print:p-0 print:shadow-none print-receipt">
      {/* Cabeçalho do recibo */}
      <div className="flex flex-col items-center mb-6 print:mb-4">
        <div className="w-32 h-16 mb-2 flex items-center justify-center">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            <rect width="100" height="50" fill="#003366" />
            <text x="50" y="30" fontFamily="Arial" fontSize="16" fill="white" textAnchor="middle">LOGO</text>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-center">RECIBO DE PAGAMENTO</h1>
        <p className="text-gray-500 text-sm">Documento não fiscal</p>
      </div>

      {/* Informações do funcionário */}
      <div className="border-t border-b border-gray-200 py-4 mb-4 print:py-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-gray-500 text-sm">Nome:</p>
            <p className="font-semibold">{employee.name}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Função:</p>
            <p className="font-semibold">{employee.role || 'Não especificada'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Valor Diário:</p>
            <p className="font-semibold">R$ {employee.dailyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Dias Trabalhados:</p>
            <p className="font-semibold">{employee.daysWorked}</p>
          </div>
        </div>
      </div>

      {/* Detalhamento dos dias trabalhados */}
      <div className="mb-6 print:mb-4">
        <h2 className="text-lg font-semibold mb-2">Dias Trabalhados</h2>
        <div className="bg-gray-50 rounded-md p-3 print:bg-white print:p-0">
          {sortedDates.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {sortedDates.map(date => (
                <div key={date} className="text-sm">
                  {format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nenhum dia registrado</p>
          )}
        </div>
      </div>

      {/* Total a pagar */}
      <div className="bg-gray-100 rounded-md p-4 mb-6 print:bg-white print:p-0 print:mb-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total a Pagar:</span>
          <span className="text-xl font-bold text-green-600">
            R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Assinaturas */}
      <div className="grid grid-cols-2 gap-8 mb-6 print:mb-4">
        <div className="flex flex-col items-center">
          <div className="border-t border-gray-300 w-full mt-8"></div>
          <p className="text-sm text-gray-500 mt-1">Assinatura do Funcionário</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="border-t border-gray-300 w-full mt-8"></div>
          <p className="text-sm text-gray-500 mt-1">Assinatura da Empresa</p>
        </div>
      </div>

      {/* Data e informações adicionais */}
      <div className="text-center text-sm text-gray-500 mb-6 print:mb-4">
        <p>Documento emitido em {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}</p>
      </div>

      {/* Botões de ação (não aparecem na impressão) */}
      <div className="flex justify-center gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
        <button
          onClick={handleShare}
          className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Compartilhar
        </button>
      </div>
    </div>
  );
};

export default EmployeeReceipt; 