import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Employee } from '../types';
import { formatDateBR } from '../utils/dateUtils';

/**
 * Componente para exibir a lista de funcionários
 */
export function EmployeesList() {
  const { employees, ui, weekSelection } = useAppContext();
  
  // Obtém os funcionários da semana selecionada
  const weekKey = formatDateBR(weekSelection.selectedWeekStart).replace(/\//g, '-');
  const weekEmployees = employees.employees[weekKey] || [];
  
  // Função para adicionar um dia trabalhado
  const handleAddDay = (employeeId: string) => {
    employees.addDay(weekKey, employeeId);
  };
  
  // Função para resetar os dias trabalhados
  const handleResetEmployee = (employeeId: string) => {
    employees.resetEmployee(weekKey, employeeId);
  };
  
  // Função para editar um funcionário
  const handleEditEmployee = (employee: Employee) => {
    // Implementar lógica de edição
    console.log('Editar funcionário:', employee);
  };
  
  // Calcula o valor total a pagar para um funcionário
  const calculateEmployeeTotal = (employee: Employee): number => {
    return employee.daysWorked * employee.dailyRate;
  };
  
  return (
    <div className="employees-list">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Funcionários</h2>
        <button
          onClick={() => ui.openAddDialog()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Adicionar Funcionário
        </button>
      </div>
      
      {weekEmployees.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">Nenhum funcionário encontrado para esta semana.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Nome</th>
                <th className="py-2 px-4 border-b text-left">Função</th>
                <th className="py-2 px-4 border-b text-left">Diária</th>
                <th className="py-2 px-4 border-b text-left">Dias Trabalhados</th>
                <th className="py-2 px-4 border-b text-left">Total</th>
                <th className="py-2 px-4 border-b text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {weekEmployees.map((employee) => (
                <tr key={employee.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{employee.name}</td>
                  <td className="py-2 px-4">{employee.role}</td>
                  <td className="py-2 px-4">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(employee.dailyRate)}
                  </td>
                  <td className="py-2 px-4">{employee.daysWorked}</td>
                  <td className="py-2 px-4">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(calculateEmployeeTotal(employee))}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAddDay(employee.id)}
                        className="p-1 bg-green-100 text-green-800 rounded-md"
                      >
                        +1 Dia
                      </button>
                      <button
                        onClick={() => handleResetEmployee(employee.id)}
                        className="p-1 bg-yellow-100 text-yellow-800 rounded-md"
                      >
                        Resetar
                      </button>
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="p-1 bg-blue-100 text-blue-800 rounded-md"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Total a pagar */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Total a Pagar:</span>
          <span className="text-lg font-semibold ml-2">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(
              weekEmployees.reduce((total, employee) => total + calculateEmployeeTotal(employee), 0)
            )}
          </span>
        </div>
      </div>
      
      {/* Seção Will */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Will</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Taxa Base</h4>
              <div className="flex items-center">
                <span className="text-lg font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(employees.willBaseRate)}
                </span>
                <button
                  onClick={() => ui.openRateDialog()}
                  className="ml-2 p-1 bg-blue-100 text-blue-800 rounded-md"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Bônus</h4>
              <div className="flex items-center">
                <span className="text-lg font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(employees.willBonus)}
                </span>
                <button
                  onClick={() => ui.openRateDialog()}
                  className="ml-2 p-1 bg-blue-100 text-blue-800 rounded-md"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 