import { StorageItems, PendingChange } from '../types';

const STORAGE_KEY = 'expenses-app-data';
const PENDING_CHANGES_KEY = 'expenses-app-pending-changes';
const DB_NAME = 'expenses-app-db';
const DB_VERSION = 1;
const STORE_NAME = 'app-data';
const PENDING_STORE_NAME = 'pending-changes';

// Flag para controlar se o IndexedDB está disponível e funcionando
let indexedDBAvailable = false;

// Função para gerar ID único para mudanças
const generateChangeId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Função para abrir o banco IndexedDB
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      indexedDBAvailable = false;
      reject('IndexedDB não é suportado neste navegador');
      return;
    }
    
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Erro ao abrir IndexedDB:', event);
      indexedDBAvailable = false;
      reject('Erro ao abrir IndexedDB');
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      indexedDBAvailable = true;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      console.log('Criando ou atualizando banco de dados IndexedDB');
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Criar object store para os dados
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      
      // Criar object store para mudanças pendentes
      if (!db.objectStoreNames.contains(PENDING_STORE_NAME)) {
        const pendingStore = db.createObjectStore(PENDING_STORE_NAME, { keyPath: 'id' });
        pendingStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Inicializar o banco de dados ao carregar o módulo
openDatabase().catch(error => {
  console.warn('Usando localStorage como fallback:', error);
});

// Função para verificar se o dispositivo está online
const isOnline = (): boolean => {
  return navigator.onLine;
};

// Função para sincronizar entre abas/janelas
const setupStorageSync = () => {
  // Ouvir eventos de armazenamento de outras abas/janelas
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        console.log('Dados atualizados em outra aba/janela:', data);
        
        // Disparar evento para atualizar a UI
        window.dispatchEvent(new CustomEvent('localStorageUpdated', { 
          detail: data 
        }));
      } catch (error) {
        console.error('Erro ao processar dados de outra aba:', error);
      }
    }
  });
};

// Inicializar sincronização entre abas
setupStorageSync();

// Rastrear mudanças de conectividade
let offlineMode = !isOnline();
window.addEventListener('online', () => {
  console.log('Dispositivo está online agora');
  offlineMode = false;
  window.dispatchEvent(new CustomEvent('connectivityChange', { detail: { online: true } }));
});

window.addEventListener('offline', () => {
  console.log('Dispositivo está offline agora');
  offlineMode = true;
  window.dispatchEvent(new CustomEvent('connectivityChange', { detail: { online: false } }));
});

// Salvar dados no IndexedDB
const saveToIndexedDB = async (data: StorageItems): Promise<boolean> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const currentTimestamp = new Date().getTime();
      
      // Adicionar ID fixo para acessar facilmente
      const dataToSave = {
        id: 'main-data',
        ...data,
        updatedAt: currentTimestamp,
        version: (data.version || 0) + 1,
        lastUpdated: currentTimestamp,
        isOffline: offlineMode
      };
      
      const request = store.put(dataToSave);
      
      request.onsuccess = () => {
        console.log('Dados salvos no IndexedDB com sucesso');
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('Erro ao salvar no IndexedDB:', event);
        reject('Erro ao salvar no IndexedDB');
      };
    });
  } catch (error) {
    console.error('Erro ao acessar IndexedDB:', error);
    return false;
  }
};

// Carregar dados do IndexedDB
const loadFromIndexedDB = async (): Promise<StorageItems | null> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get('main-data');
      
      request.onsuccess = () => {
        if (request.result) {
          const { id, lastUpdated, ...data } = request.result;
          console.log('Dados carregados do IndexedDB com sucesso');
          resolve(data as StorageItems);
        } else {
          console.log('Nenhum dado encontrado no IndexedDB');
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error('Erro ao carregar do IndexedDB:', event);
        reject('Erro ao carregar do IndexedDB');
      };
    });
  } catch (error) {
    console.error('Erro ao acessar IndexedDB:', error);
    return null;
  }
};

// Adicionar uma mudança pendente
const addPendingChange = async (change: Omit<PendingChange, 'id' | 'timestamp' | 'syncStatus'>): Promise<string> => {
  const newChange: PendingChange = {
    ...change,
    id: generateChangeId(),
    timestamp: new Date().toISOString(),
    syncStatus: 'pending'
  };
  
  try {
    if (indexedDBAvailable) {
      const db = await openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PENDING_STORE_NAME);
        
        const request = store.add(newChange);
        
        request.onsuccess = () => {
          console.log('Mudança pendente adicionada ao IndexedDB:', newChange);
          resolve(newChange.id);
        };
        
        request.onerror = (event) => {
          console.error('Erro ao adicionar mudança pendente ao IndexedDB:', event);
          reject('Erro ao adicionar mudança pendente');
        };
      });
    } else {
      // Fallback para localStorage
      const pendingChanges = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]') as PendingChange[];
      pendingChanges.push(newChange);
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges));
      console.log('Mudança pendente adicionada ao localStorage:', newChange);
      return newChange.id;
    }
  } catch (error) {
    console.error('Erro ao adicionar mudança pendente:', error);
    
    // Fallback para localStorage em caso de erro
    try {
      const pendingChanges = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]') as PendingChange[];
      pendingChanges.push(newChange);
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges));
    } catch (e) {
      console.error('Erro no fallback para localStorage:', e);
    }
    
    return newChange.id;
  }
};

// Obter todas as mudanças pendentes
const getPendingChanges = async (): Promise<PendingChange[]> => {
  try {
    if (indexedDBAvailable) {
      const db = await openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PENDING_STORE_NAME);
        const index = store.index('syncStatus');
        
        const request = index.getAll('pending');
        
        request.onsuccess = () => {
          console.log('Mudanças pendentes carregadas do IndexedDB:', request.result);
          resolve(request.result || []);
        };
        
        request.onerror = (event) => {
          console.error('Erro ao carregar mudanças pendentes do IndexedDB:', event);
          reject('Erro ao carregar mudanças pendentes');
        };
      });
    } else {
      // Fallback para localStorage
      const pendingChanges = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]') as PendingChange[];
      console.log('Mudanças pendentes carregadas do localStorage:', pendingChanges);
      return pendingChanges.filter(change => change.syncStatus === 'pending');
    }
  } catch (error) {
    console.error('Erro ao obter mudanças pendentes:', error);
    
    // Tentar fallback para localStorage em caso de erro
    try {
      const pendingChanges = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]') as PendingChange[];
      return pendingChanges.filter(change => change.syncStatus === 'pending');
    } catch (e) {
      console.error('Erro no fallback para localStorage:', e);
      return [];
    }
  }
};

// Atualizar o status de uma mudança pendente
const updatePendingChangeStatus = async (id: string, status: 'pending' | 'completed' | 'failed', errorDetails?: string): Promise<boolean> => {
  try {
    if (indexedDBAvailable) {
      const db = await openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PENDING_STORE_NAME);
        
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            const change = getRequest.result;
            change.syncStatus = status;
            if (errorDetails) {
              // Adicionar o erro apenas como informação, sem tipagem estrita
              (change as any).errorMessage = errorDetails;
            }
            
            const updateRequest = store.put(change);
            
            updateRequest.onsuccess = () => {
              console.log(`Mudança ${id} atualizada para status: ${status}`);
              resolve(true);
            };
            
            updateRequest.onerror = (event) => {
              console.error(`Erro ao atualizar status da mudança ${id}:`, event);
              reject('Erro ao atualizar mudança pendente');
            };
          } else {
            console.warn(`Mudança ${id} não encontrada para atualização`);
            resolve(false);
          }
        };
        
        getRequest.onerror = (event) => {
          console.error(`Erro ao buscar mudança ${id}:`, event);
          reject('Erro ao buscar mudança pendente');
        };
      });
    } else {
      // Fallback para localStorage
      const pendingChanges = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]') as PendingChange[];
      const index = pendingChanges.findIndex(change => change.id === id);
      
      if (index !== -1) {
        pendingChanges[index].syncStatus = status;
        if (errorDetails) {
          // Adicionar o erro apenas como informação, sem tipagem estrita
          (pendingChanges[index] as any).errorMessage = errorDetails;
        }
        localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges));
        console.log(`Mudança ${id} atualizada para status: ${status} (localStorage)`);
        return true;
      } else {
        console.warn(`Mudança ${id} não encontrada no localStorage`);
        return false;
      }
    }
  } catch (error) {
    console.error(`Erro ao atualizar status da mudança ${id}:`, error);
    
    // Tentar fallback para localStorage em caso de erro
    try {
      const pendingChanges = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]') as PendingChange[];
      const index = pendingChanges.findIndex(change => change.id === id);
      
      if (index !== -1) {
        pendingChanges[index].syncStatus = status;
        if (errorDetails) {
          // Adicionar o erro apenas como informação, sem tipagem estrita
          (pendingChanges[index] as any).errorMessage = errorDetails;
        }
        localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges));
        return true;
      }
    } catch (e) {
      console.error('Erro no fallback para localStorage:', e);
    }
    
    return false;
  }
};

// Remover mudanças sincronizadas com sucesso
const removeSyncedChanges = async (): Promise<void> => {
  try {
    if (indexedDBAvailable) {
      const db = await openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PENDING_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PENDING_STORE_NAME);
        const index = store.index('syncStatus');
        
        const request = index.openCursor('completed');
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            console.log('Mudanças sincronizadas removidas com sucesso');
            resolve();
          }
        };
        
        request.onerror = (event) => {
          console.error('Erro ao remover mudanças sincronizadas:', event);
          reject('Erro ao remover mudanças sincronizadas');
        };
      });
    } else {
      // Fallback para localStorage
      const pendingChanges = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]') as PendingChange[];
      const filteredChanges = pendingChanges.filter(change => change.syncStatus !== 'completed');
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(filteredChanges));
      console.log('Mudanças sincronizadas removidas do localStorage');
    }
  } catch (error) {
    console.error('Erro ao remover mudanças sincronizadas:', error);
    
    // Tentar fallback para localStorage em caso de erro
    try {
      const pendingChanges = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]') as PendingChange[];
      const filteredChanges = pendingChanges.filter(change => change.syncStatus !== 'completed');
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(filteredChanges));
    } catch (e) {
      console.error('Erro no fallback para localStorage:', e);
    }
  }
};

export const storage = {
  save: async (data: StorageItems): Promise<void> => {
    try {
      console.log('Salvando dados no armazenamento local:', data);
      
      // Verificar se está offline para rastrear mudanças
      const offline = !isOnline();
      
      // Adicionar metadados
      const currentTimestamp = new Date().getTime();
      const dataWithMeta = {
        ...data,
        updatedAt: currentTimestamp,
        version: (data.version || 0) + 1,
        isOffline: offline
      };
      
      // Tentar salvar no IndexedDB primeiro
      if (indexedDBAvailable) {
        try {
          await saveToIndexedDB(dataWithMeta);
        } catch (error) {
          console.warn('Erro ao salvar no IndexedDB, usando localStorage como fallback:', error);
          // Falhar silenciosamente e usar localStorage como fallback
          indexedDBAvailable = false;
        }
      }
      
      // Sempre salvar no localStorage como fallback
      const serialized = JSON.stringify({
        expenses: dataWithMeta.expenses || {},
        projects: dataWithMeta.projects || [],
        stock: dataWithMeta.stock || [],
        employees: dataWithMeta.employees || {},
        willBaseRate: dataWithMeta.willBaseRate || 200,
        willBonus: dataWithMeta.willBonus || 0,
        lastSync: dataWithMeta.lastSync || currentTimestamp,
        updatedAt: currentTimestamp,
        version: dataWithMeta.version,
        isOffline: offline
      });
      
      localStorage.setItem(STORAGE_KEY, serialized);
      
      // Disparar evento para notificar outras partes do app que os dados foram atualizados
      window.dispatchEvent(new CustomEvent('localDataUpdated', { 
        detail: dataWithMeta 
      }));
    } catch (error) {
      console.error('Erro ao salvar no armazenamento local:', error);
    }
  },
  
  load: async (): Promise<StorageItems | null> => {
    try {
      console.log('Carregando dados do armazenamento local...');
      
      // Tentar carregar do IndexedDB primeiro
      if (indexedDBAvailable) {
        try {
          const idbData = await loadFromIndexedDB();
          if (idbData) {
            console.log('Dados carregados do IndexedDB:', idbData);
            return idbData;
          }
        } catch (error) {
          console.warn('Erro ao carregar do IndexedDB, usando localStorage como fallback:', error);
          // Falhar silenciosamente e usar localStorage como fallback
          indexedDBAvailable = false;
        }
      }
      
      // Fallback para localStorage
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        console.log('Nenhum dado encontrado no armazenamento local');
        return null;
      }
      
      const data = JSON.parse(serialized) as StorageItems;
      console.log('Dados carregados do localStorage:', data);
      return data;
    } catch (error) {
      console.error('Erro ao carregar do armazenamento local:', error);
      return null;
    }
  },
  
  clear: async (): Promise<void> => {
    try {
      // Limpar IndexedDB se disponível
      if (indexedDBAvailable) {
        try {
          const db = await openDatabase();
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.delete('main-data');
        } catch (error) {
          console.warn('Erro ao limpar IndexedDB:', error);
        }
      }
      
      // Sempre limpar localStorage também
      localStorage.removeItem(STORAGE_KEY);
      console.log('Armazenamento local limpo');
    } catch (error) {
      console.error('Erro ao limpar armazenamento local:', error);
    }
  },
  
  setupSyncListener: (callback: (data: StorageItems) => void): (() => void) => {
    const handleStorageUpdate = (event: CustomEvent<StorageItems>) => {
      console.log('Evento de atualização do armazenamento local recebido:', event.detail);
      callback(event.detail);
    };
    
    window.addEventListener('localStorageUpdated', handleStorageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('localStorageUpdated', handleStorageUpdate as EventListener);
    };
  },
  
  // Métodos para gerenciar mudanças offline
  offline: {
    isOffline: () => offlineMode,
    
    // Adicionar uma mudança pendente
    addPendingChange: async (change: Omit<PendingChange, 'id' | 'timestamp' | 'syncStatus'>): Promise<string> => {
      return addPendingChange(change);
    },
    
    // Obter todas as mudanças pendentes
    getPendingChanges: async (): Promise<PendingChange[]> => {
      return getPendingChanges();
    },
    
    // Atualizar status de uma mudança
    updateChangeStatus: async (id: string, status: 'pending' | 'completed' | 'failed', errorDetails?: string): Promise<boolean> => {
      return updatePendingChangeStatus(id, status, errorDetails);
    },
    
    // Remover mudanças sincronizadas
    cleanupSyncedChanges: async (): Promise<void> => {
      return removeSyncedChanges();
    },
    
    // Registrar listener para mudanças de conectividade
    onConnectivityChange: (callback: (online: boolean) => void): (() => void) => {
      const handler = (event: CustomEvent<{online: boolean}>) => {
        callback(event.detail.online);
      };
      
      window.addEventListener('connectivityChange', handler as EventListener);
      
      return () => {
        window.removeEventListener('connectivityChange', handler as EventListener);
      };
    }
  }
};

export const getData = async (): Promise<StorageItems> => {
  const data = await storage.load();
  if (data) {
    return data;
  }
  
  // Dados padrão se não houver nada salvo
  return {
    expenses: {},
    projects: [],
    stock: [],
    employees: {},
    willBaseRate: 200,
    willBonus: 0,
    lastSync: new Date().getTime(),
    updatedAt: new Date().getTime(),
    version: 1,
    isOffline: !isOnline(),
    pendingChanges: []
  };
};
