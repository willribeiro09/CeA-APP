import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Briefcase, CheckCircle2, AlertCircle, Users, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Project, Expense, Employee } from '../types';
import * as Dialog from '@radix-ui/react-dialog';

interface EmployeePayment {
  name: string;
  amount: number;
}

interface MonthSummaryData {
  projectsTotal: number;
  projectsBreakdown: {
    private: number;
    power: number;
  };
  paidExpenses: {
    total: number;
    quantity: number;
  };
  unpaidExpenses: {
    total: number;
    quantity: number;
  };
  employeesTotal: number;
  employees: EmployeePayment[];
  monthName: string;
}

interface MonthSummaryPopupProps {
  data: MonthSummaryData;
  isOpen: boolean;
  onClose: () => void;
}

export function MonthSummaryPopup({ data, isOpen, onClose }: MonthSummaryPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Pequeno delay para animação de entrada
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const balance = data.projectsTotal - data.paidExpenses.total - data.employeesTotal;
  const isPositiveBalance = balance >= 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <Dialog.Content 
          className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl shadow-2xl z-50 w-[95%] max-w-lg p-4 sm:p-6 transition-all duration-300 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Header com gradiente */}
          <div className="flex items-center justify-between mb-4 sm:mb-5 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#5ABB37] to-[#4aa030] rounded-lg shadow-lg">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <Dialog.Title className="text-lg sm:text-2xl font-bold text-gray-800">
                  Fechamento do mês
                </Dialog.Title>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{data.monthName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 sm:p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* Valor Total dos Projetos */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-blue-50 via-blue-100/50 to-cyan-50 rounded-xl p-3 sm:p-4 border-2 border-blue-200/50 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-md">
                      <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-blue-900 block">Valor Total dos Projetos</span>
                    </div>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                    {formatCurrency(data.projectsTotal)}
                  </span>
                </div>
                <div className="space-y-1.5 mt-2 pt-2 border-t border-blue-200/50">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] sm:text-xs text-blue-700 font-medium">Particular</span>
                    <span className="text-xs sm:text-sm font-semibold text-blue-900">
                      {formatCurrency(data.projectsBreakdown.private)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] sm:text-xs text-blue-700 font-medium">Power</span>
                    <span className="text-xs sm:text-sm font-semibold text-blue-900">
                      {formatCurrency(data.projectsBreakdown.power)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Despesas Pagas */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50 rounded-xl p-3 sm:p-4 border-2 border-green-200/50 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-md">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-green-900 block">Despesas Pagas</span>
                      <span className="text-[10px] sm:text-xs text-green-600 mt-0.5">{data.paidExpenses.quantity} despesa{data.paidExpenses.quantity !== 1 ? 's' : ''} quitadas</span>
                    </div>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                    {formatCurrency(data.paidExpenses.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Despesas Não Pagas */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 rounded-xl p-3 sm:p-4 border-2 border-red-200/50 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg shadow-md">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-red-900 block">Despesas Não Pagas</span>
                      <span className="text-[10px] sm:text-xs text-red-600 mt-0.5">{data.unpaidExpenses.quantity} despesa{data.unpaidExpenses.quantity !== 1 ? 's' : ''} pendentes</span>
                    </div>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-red-700 to-orange-700 bg-clip-text text-transparent">
                    {formatCurrency(data.unpaidExpenses.total)}
                  </span>
                </div>
                <div className="mt-1.5 text-[10px] sm:text-xs text-orange-600 font-medium bg-orange-100/50 rounded-lg px-2 py-1.5">
                  Estas despesas serão levadas para o próximo mês
                </div>
              </div>
            </div>

            {/* Pagamentos de Funcionários */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-purple-50 via-pink-50 to-violet-50 rounded-xl p-3 sm:p-4 border-2 border-purple-200/50 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-purple-900 block">Pagamentos de Funcionários</span>
                    </div>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">
                    {formatCurrency(data.employeesTotal)}
                  </span>
                </div>
                {data.employees.length > 0 && (
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-purple-200/50">
                    {data.employees.map((employee, index) => (
                      <div key={index} className="flex items-center justify-between px-1">
                        <span className="text-[10px] sm:text-xs text-purple-700 font-medium capitalize">
                          {employee.name}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-purple-900">
                          {formatCurrency(employee.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Resumo Geral - Saldo */}
            <div className="relative group mt-4 sm:mt-5">
              <div className={`absolute inset-0 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                isPositiveBalance 
                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20' 
                  : 'bg-gradient-to-r from-red-500/20 to-orange-500/20'
              }`}></div>
              <div className={`relative rounded-xl p-4 sm:p-5 border-2 shadow-xl transition-all duration-300 ${
                isPositiveBalance
                  ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50 border-green-300'
                  : 'bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 border-red-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {isPositiveBalance ? (
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-lg">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    ) : (
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg shadow-lg">
                        <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <span className={`text-sm sm:text-base font-bold block ${
                        isPositiveBalance ? 'text-green-900' : 'text-red-900'
                      }`}>
                        Saldo do Mês
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                        Receitas - Despesas Pagas - Funcionários
                      </span>
                    </div>
                  </div>
                  <span className={`text-xl sm:text-3xl font-extrabold ${
                    isPositiveBalance
                      ? 'bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent'
                      : 'bg-gradient-to-r from-red-700 to-orange-700 bg-clip-text text-transparent'
                  }`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-5 pt-3 border-t border-gray-200">
            <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-amber-50/50 border border-amber-200/50 rounded-lg">
              <p className="text-[10px] sm:text-xs text-amber-800 leading-relaxed text-center italic">
                <span className="font-semibold">Observação:</span> Os dados acima refletem exclusivamente o que foi registrado no aplicativo. Para valores próximos da realidade, recomendo que todos os gastos referentes à empresa sejam registrados no aplicativo.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-[#5ABB37] to-[#4aa030] text-white rounded-xl hover:from-[#4aa030] hover:to-[#3d8d26] transition-all duration-300 font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
