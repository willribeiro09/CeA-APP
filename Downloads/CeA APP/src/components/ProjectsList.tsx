import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Project } from '../types';
import { formatDateBR } from '../utils/dateUtils';

/**
 * Componente para exibir a lista de projetos
 */
export function ProjectsList() {
  const { projects, ui, weekSelection } = useAppContext();
  
  // Filtra os projetos pelo intervalo de datas da semana selecionada
  const filteredProjects = projects.filterByDateRange(
    weekSelection.selectedWeekStart,
    weekSelection.selectedWeekEnd
  );
  
  // Função para adicionar um novo projeto
  const handleAddProject = () => {
    ui.openAddDialog();
  };
  
  // Função para editar um projeto
  const handleEditProject = (project: Project) => {
    // Implementar lógica de edição
    console.log('Editar projeto:', project);
  };
  
  // Função para excluir um projeto
  const handleDeleteProject = (id: string) => {
    // Implementar lógica de exclusão
    console.log('Excluir projeto:', id);
  };
  
  // Função para alternar o status de faturamento
  const handleToggleInvoiced = (id: string) => {
    projects.toggleInvoiced(id);
  };
  
  return (
    <div className="projects-list">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Projetos</h2>
        <button
          onClick={handleAddProject}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Adicionar Projeto
        </button>
      </div>
      
      {filteredProjects.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">Nenhum projeto encontrado para este período.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Nome</th>
                <th className="py-2 px-4 border-b text-left">Cliente</th>
                <th className="py-2 px-4 border-b text-left">Valor</th>
                <th className="py-2 px-4 border-b text-left">Início</th>
                <th className="py-2 px-4 border-b text-left">Fim</th>
                <th className="py-2 px-4 border-b text-left">Status</th>
                <th className="py-2 px-4 border-b text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{project.name}</td>
                  <td className="py-2 px-4">{project.client}</td>
                  <td className="py-2 px-4">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(project.value)}
                  </td>
                  <td className="py-2 px-4">{formatDateBR(new Date(project.startDate))}</td>
                  <td className="py-2 px-4">{project.endDate ? formatDateBR(new Date(project.endDate)) : 'N/A'}</td>
                  <td className="py-2 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        project.invoiced
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {project.invoiced ? 'Faturado' : 'Pendente'}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleInvoiced(project.id)}
                        className={`p-1 rounded-md ${
                          project.invoiced
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {project.invoiced ? 'Marcar como Pendente' : 'Marcar como Faturado'}
                      </button>
                      <button
                        onClick={() => handleEditProject(project)}
                        className="p-1 bg-blue-100 text-blue-800 rounded-md"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
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
      
      {/* Total de projetos */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Total:</span>
          <span className="text-lg font-semibold ml-2">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(
              filteredProjects.reduce((total, project) => total + project.value, 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
} 