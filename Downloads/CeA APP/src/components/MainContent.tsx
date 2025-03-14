import React from 'react';
import { useAppContext } from '../context/AppContext';
import { ExpensesList } from './ExpensesList';
import { ProjectsList } from './ProjectsList';
import { EmployeesList } from './EmployeesList';
import { StockList } from './StockList';

/**
 * Componente principal que exibe o conteúdo de acordo com a categoria selecionada
 */
export function MainContent() {
  const { ui, weekSelection } = useAppContext();
  
  // Função para alternar a categoria
  const handleCategoryChange = (category: string) => {
    ui.setActiveCategory(category as any);
  };
  
  // Função para navegar para a semana anterior
  const handlePreviousWeek = () => {
    weekSelection.previousWeek();
  };
  
  // Função para navegar para a próxima semana
  const handleNextWeek = () => {
    weekSelection.nextWeek();
  };
  
  // Função para abrir o calendário
  const handleOpenCalendar = () => {
    ui.openCalendar();
  };
  
  // Renderiza o conteúdo de acordo com a categoria selecionada
  const renderContent = () => {
    switch (ui.activeCategory) {
      case 'expenses':
        return <ExpensesList />;
      case 'projects':
        return <ProjectsList />;
      case 'employees':
        return <EmployeesList />;
      case 'stock':
        return <StockList />;
      case 'will':
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Will</h2>
            <p className="text-gray-600">Esta seção está em desenvolvimento.</p>
          </div>
        );
      default:
        return <div>Selecione uma categoria</div>;
    }
  };
  
  return (
    <div className="main-content">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <button
                onClick={() => handleCategoryChange('expenses')}
                className={`px-4 py-2 rounded-md ${
                  ui.activeCategory === 'expenses' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                }`}
              >
                Despesas
              </button>
              <button
                onClick={() => handleCategoryChange('projects')}
                className={`px-4 py-2 rounded-md ${
                  ui.activeCategory === 'projects' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                }`}
              >
                Projetos
              </button>
              <button
                onClick={() => handleCategoryChange('employees')}
                className={`px-4 py-2 rounded-md ${
                  ui.activeCategory === 'employees' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                }`}
              >
                Funcionários
              </button>
              <button
                onClick={() => handleCategoryChange('stock')}
                className={`px-4 py-2 rounded-md ${
                  ui.activeCategory === 'stock' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                }`}
              >
                Estoque
              </button>
              <button
                onClick={() => handleCategoryChange('will')}
                className={`px-4 py-2 rounded-md ${
                  ui.activeCategory === 'will' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                }`}
              >
                Will
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousWeek}
                className="p-2 bg-gray-100 rounded-md"
              >
                &lt;
              </button>
              <button
                onClick={handleOpenCalendar}
                className="px-4 py-2 bg-gray-100 rounded-md"
              >
                {weekSelection.weekLabel}
              </button>
              <button
                onClick={handleNextWeek}
                className="p-2 bg-gray-100 rounded-md"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {renderContent()}
      </div>
      
      {ui.isCalendarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Selecionar Data</h3>
              <button
                onClick={ui.closeCalendar}
                className="p-2 bg-gray-100 rounded-md"
              >
                X
              </button>
            </div>
            <div className="p-4">
              <p>Componente de calendário será implementado aqui</p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={ui.closeCalendar}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 