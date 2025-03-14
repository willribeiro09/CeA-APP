import { StorageItems } from '../../types';
import { storage } from '../storage';
import { ChangeEvent, CHANGE_TYPE } from './types';

// Identificador único para esta sessão do navegador
export const SESSION_ID = Math.random().toString(36).substring(2, 15);
console.log('ID da sessão:', SESSION_ID);

// Variáveis para sincronização baseada em eventos
export let lastProcessedChangeId: string | null = null;

// Função para gerar ID único para eventos de alteração
export const generateChangeId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// Processar um evento de alteração
export const processChangeEvent = async (changeEvent: ChangeEvent): Promise<void> => {
  // Ignorar eventos gerados pela própria sessão
  if (changeEvent.sessionId === SESSION_ID) {
    console.log('Ignorando evento gerado pela sessão atual:', changeEvent.id);
    return;
  }
  
  // Verificar se já processamos este evento antes
  if (changeEvent.id === lastProcessedChangeId) {
    console.log('Evento já processado, ignorando:', changeEvent.id);
    return;
  }
  
  console.log('Processando evento de alteração:', changeEvent);
  lastProcessedChangeId = changeEvent.id;
  
  // Carregar dados locais atuais
  const localData = storage.load() || {
    expenses: {},
    projects: [],
    stock: [],
    employees: {},
    willBaseRate: 200,
    willBonus: 0,
    lastSync: Date.now()
  };
  
  let dataChanged = false;
  
  // Aplicar a alteração com base no tipo
  switch (changeEvent.itemType) {
    case 'expense':
      dataChanged = applyExpenseChange(localData, changeEvent);
      break;
    case 'project':
      dataChanged = applyProjectChange(localData, changeEvent);
      break;
    case 'stock':
      dataChanged = applyStockChange(localData, changeEvent);
      break;
    case 'employee':
      dataChanged = applyEmployeeChange(localData, changeEvent);
      break;
    case 'willSettings':
      dataChanged = applyWillSettingsChange(localData, changeEvent);
      break;
  }
  
  // Se os dados foram alterados, salvar localmente e notificar a UI
  if (dataChanged) {
    storage.save(localData);
    window.dispatchEvent(new CustomEvent('dataUpdated', { 
      detail: localData 
    }));
  }
};

// Aplicar alteração em despesa
export const applyExpenseChange = (data: StorageItems, changeEvent: ChangeEvent): boolean => {
  if (!changeEvent.listName) {
    console.error('ListName é obrigatório para alterações em despesas');
    return false;
  }
  
  if (!data.expenses[changeEvent.listName]) {
    data.expenses[changeEvent.listName] = [];
  }
  
  switch (changeEvent.changeType) {
    case CHANGE_TYPE.ADD:
    case CHANGE_TYPE.UPDATE:
      if (!changeEvent.data) return false;
      
      const existingIndex = data.expenses[changeEvent.listName].findIndex(
        e => e.id === changeEvent.itemId
      );
      
      if (existingIndex >= 0) {
        data.expenses[changeEvent.listName][existingIndex] = changeEvent.data;
      } else {
        data.expenses[changeEvent.listName].push(changeEvent.data);
      }
      return true;
      
    case CHANGE_TYPE.DELETE:
      const deleteIndex = data.expenses[changeEvent.listName].findIndex(
        e => e.id === changeEvent.itemId
      );
      
      if (deleteIndex >= 0) {
        data.expenses[changeEvent.listName].splice(deleteIndex, 1);
        return true;
      }
      return false;
    default:
      return false;
  }
};

// Aplicar alteração em projeto
export const applyProjectChange = (data: StorageItems, changeEvent: ChangeEvent): boolean => {
  switch (changeEvent.changeType) {
    case CHANGE_TYPE.ADD:
    case CHANGE_TYPE.UPDATE:
      if (!changeEvent.data) return false;
      
      const existingIndex = data.projects.findIndex(
        p => p.id === changeEvent.itemId
      );
      
      if (existingIndex >= 0) {
        data.projects[existingIndex] = changeEvent.data;
      } else {
        data.projects.push(changeEvent.data);
      }
      return true;
      
    case CHANGE_TYPE.DELETE:
      const deleteIndex = data.projects.findIndex(
        p => p.id === changeEvent.itemId
      );
      
      if (deleteIndex >= 0) {
        data.projects.splice(deleteIndex, 1);
        return true;
      }
      return false;
    default:
      return false;
  }
};

// Aplicar alteração em item de estoque
export const applyStockChange = (data: StorageItems, changeEvent: ChangeEvent): boolean => {
  switch (changeEvent.changeType) {
    case CHANGE_TYPE.ADD:
    case CHANGE_TYPE.UPDATE:
      if (!changeEvent.data) return false;
      
      const existingIndex = data.stock.findIndex(
        s => s.id === changeEvent.itemId
      );
      
      if (existingIndex >= 0) {
        data.stock[existingIndex] = changeEvent.data;
      } else {
        data.stock.push(changeEvent.data);
      }
      return true;
      
    case CHANGE_TYPE.DELETE:
      const deleteIndex = data.stock.findIndex(
        s => s.id === changeEvent.itemId
      );
      
      if (deleteIndex >= 0) {
        data.stock.splice(deleteIndex, 1);
        return true;
      }
      return false;
    default:
      return false;
  }
};

// Aplicar alteração em funcionário
export const applyEmployeeChange = (data: StorageItems, changeEvent: ChangeEvent): boolean => {
  if (!changeEvent.listName) {
    console.error('ListName é obrigatório para alterações em funcionários');
    return false;
  }
  
  if (!data.employees[changeEvent.listName]) {
    data.employees[changeEvent.listName] = [];
  }
  
  switch (changeEvent.changeType) {
    case CHANGE_TYPE.ADD:
    case CHANGE_TYPE.UPDATE:
      if (!changeEvent.data) return false;
      
      const existingIndex = data.employees[changeEvent.listName].findIndex(
        e => e.id === changeEvent.itemId
      );
      
      if (existingIndex >= 0) {
        data.employees[changeEvent.listName][existingIndex] = changeEvent.data;
      } else {
        data.employees[changeEvent.listName].push(changeEvent.data);
      }
      return true;
      
    case CHANGE_TYPE.DELETE:
      const deleteIndex = data.employees[changeEvent.listName].findIndex(
        e => e.id === changeEvent.itemId
      );
      
      if (deleteIndex >= 0) {
        data.employees[changeEvent.listName].splice(deleteIndex, 1);
        return true;
      }
      return false;
    default:
      return false;
  }
};

// Aplicar alteração nas configurações do Will
export const applyWillSettingsChange = (data: StorageItems, changeEvent: ChangeEvent): boolean => {
  if (!changeEvent.data) return false;
  
  if (changeEvent.changeType === CHANGE_TYPE.UPDATE) {
    if (typeof changeEvent.data.willBaseRate === 'number') {
      data.willBaseRate = changeEvent.data.willBaseRate;
    }
    
    if (typeof changeEvent.data.willBonus === 'number') {
      data.willBonus = changeEvent.data.willBonus;
    }
    
    return true;
  }
  
  return false;
}; 