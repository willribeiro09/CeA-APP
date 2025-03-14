import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Expense } from '../types';
import { formatDateBR } from '../utils/dateUtils';

/**
 * Componente para exibir a lista de despesas
 */
export function ExpensesList() {
  const { expenses, ui, weekSelection } = useAppContext();
  
  // Obtém as despesas da semana selecionada
  const weekKey = formatDateBR(weekSelection.selectedWeekStart).replace(/\//g, '-');
  const weekExpenses = expenses.expenses[weekKey] || [];
  
  // Função para adicionar uma nova despesa
  const handleAddExpense = () => {
    ui.openAddDialog();
  };
  
  // Função para editar uma despesa
  const handleEditExpense = (expense: Expense) => {
    // Implementar lógica de edição
    console.log('Editar despesa:', expense);
  };
  
  // Função para excluir uma despesa
  const handleDeleteExpense = (id: string) => {
    // Implementar lógica de exclusão
    console.log('Excluir despesa:', id);
  };
  
  // Função para alternar o status de pagamento
  const handleTogglePaid = (id: string) => {
    expenses.togglePaid(weekKey, id);
  };
  
  return (
    <div className="expenses-list">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Despesas</h2>
        <button
          onClick={handleAddExpense}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Adicionar Despesa
        </button>
      </div>
      
      {weekExpenses.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">Nenhuma despesa encontrada para esta semana.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Descrição</th>
                <th className="py-2 px-4 border-b text-left">Valor</th>
                <th className="py-2 px-4 border-b text-left">Data</th>
                <th className="py-2 px-4 border-b text-left">Categoria</th>
                <th className="py-2 px-4 border-b text-left">Status</th>
                <th className="py-2 px-4 border-b text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {weekExpenses.map((expense) => (
                <tr key={expense.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{expense.description}</td>
                  <td className="py-2 px-4">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(expense.amount)}
                  </td>
                  <td className="py-2 px-4">{formatDateBR(new Date(expense.date))}</td>
                  <td className="py-2 px-4">{expense.category}</td>
                  <td className="py-2 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        expense.paid
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {expense.paid ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleTogglePaid(expense.id)}
                        className={`p-1 rounded-md ${
                          expense.paid
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {expense.paid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                      </button>
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="p-1 bg-blue-100 text-blue-800 rounded-md"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="p-1 bg-red-100 text-red-800 rounded-md"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Total de despesas */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-lg font-semibold">
          Total: {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(
            weekExpenses.reduce((total, expense) => total + expense.amount, 0)
          )}
        </p>
      </div>
    </div>
  );
} 