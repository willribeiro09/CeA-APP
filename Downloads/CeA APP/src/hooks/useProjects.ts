import { useState, useCallback, useEffect } from 'react';
import { Project } from '../types';
import { formatDateISO, isDateInRange } from '../utils/dateUtils';
import { getData, saveData } from '../utils/storageUtils';

/**
 * Hook para gerenciar os projetos
 */
export function useProjects() {
  // Estado para armazenar os projetos
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Carrega os projetos do armazenamento local
  useEffect(() => {
    const data = getData();
    if (data && data.projects) {
      setProjects(data.projects);
    }
  }, []);
  
  // Calcula o total de projetos em um intervalo de datas
  const calculateTotal = useCallback((startDate: Date, endDate: Date): number => {
    let total = 0;
    
    // Converte as datas para o formato ISO para comparação
    const start = formatDateISO(startDate);
    const end = formatDateISO(endDate);
    
    // Filtra os projetos que estão dentro do intervalo de datas
    const filteredProjects = projects.filter(project => 
      (project.startDate >= start && project.startDate <= end) ||
      (project.endDate && project.endDate >= start && project.endDate <= end) ||
      (project.startDate <= start && project.endDate && project.endDate >= end)
    );
    
    // Soma os valores dos projetos filtrados
    total = filteredProjects.reduce((sum, project) => sum + project.value, 0);
    
    return total;
  }, [projects]);
  
  // Adiciona um novo projeto
  const addProject = useCallback((project: Partial<Project>): void => {
    // Verifica se todos os campos obrigatórios estão preenchidos
    if (!project.name || !project.client || !project.value || !project.startDate) {
      console.error('Dados incompletos para adicionar projeto');
      return;
    }
    
    setProjects(prevProjects => {
      // Cria um novo array para evitar mutação do estado anterior
      const newProject: Project = {
        id: Date.now().toString(),
        name: project.name!,
        client: project.client!,
        value: project.value!,
        startDate: project.startDate!,
        endDate: project.endDate,
        status: project.status || 'in-progress',
        invoiced: project.invoiced || false,
        location: project.location,
        description: project.description || ''
      };
      
      const updatedProjects = [...prevProjects, newProject];
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        projects: updatedProjects
      });
      
      return updatedProjects;
    });
  }, []);
  
  // Atualiza um projeto existente
  const updateProject = useCallback((id: string, updatedProject: Partial<Project>): void => {
    setProjects(prevProjects => {
      // Encontra o índice do projeto
      const projectIndex = prevProjects.findIndex(project => project.id === id);
      
      // Verifica se o projeto existe
      if (projectIndex === -1) {
        console.error(`Projeto com ID ${id} não encontrado`);
        return prevProjects;
      }
      
      // Cria um novo array para evitar mutação do estado anterior
      const updatedProjects = [...prevProjects];
      
      // Atualiza o projeto
      updatedProjects[projectIndex] = {
        ...updatedProjects[projectIndex],
        ...updatedProject
      };
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        projects: updatedProjects
      });
      
      return updatedProjects;
    });
  }, []);
  
  // Remove um projeto
  const deleteProject = useCallback((id: string): void => {
    setProjects(prevProjects => {
      // Cria um novo array para evitar mutação do estado anterior
      const updatedProjects = prevProjects.filter(project => project.id !== id);
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        projects: updatedProjects
      });
      
      return updatedProjects;
    });
  }, []);
  
  // Alterna o status de faturamento de um projeto
  const toggleInvoiced = useCallback((id: string): void => {
    setProjects(prevProjects => {
      // Encontra o índice do projeto
      const projectIndex = prevProjects.findIndex(project => project.id === id);
      
      // Verifica se o projeto existe
      if (projectIndex === -1) {
        console.error(`Projeto com ID ${id} não encontrado`);
        return prevProjects;
      }
      
      // Cria um novo array para evitar mutação do estado anterior
      const updatedProjects = [...prevProjects];
      
      // Alterna o status de faturamento
      updatedProjects[projectIndex] = {
        ...updatedProjects[projectIndex],
        invoiced: !updatedProjects[projectIndex].invoiced
      };
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        projects: updatedProjects
      });
      
      return updatedProjects;
    });
  }, []);
  
  // Filtra os projetos por intervalo de datas
  const filterByDateRange = useCallback((startDate: Date, endDate: Date): Project[] => {
    // Converte as datas para o formato ISO para comparação
    const start = formatDateISO(startDate);
    const end = formatDateISO(endDate);
    
    // Filtra os projetos que estão dentro do intervalo de datas
    return projects.filter(project => {
      const projectStartDate = project.startDate;
      const projectEndDate = project.endDate;
      
      // Verifica se a data de início do projeto está dentro do intervalo
      const startInRange = projectStartDate >= start && projectStartDate <= end;
      
      // Verifica se a data de fim do projeto está dentro do intervalo
      const endInRange = projectEndDate && projectEndDate >= start && projectEndDate <= end;
      
      // Verifica se o projeto abrange todo o intervalo
      const spansRange = projectStartDate <= start && projectEndDate && projectEndDate >= end;
      
      return startInRange || endInRange || spansRange;
    });
  }, [projects]);
  
  return {
    projects,
    calculateTotal,
    addProject,
    updateProject,
    deleteProject,
    toggleInvoiced,
    filterByDateRange
  };
} 