import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee, ChangeType, ItemType, ItemChange } from '../types';
import { storage } from './storage';
import { v4 as uuidv4 } from 'uuid';

// ID único para esta sessão do navegador, para evitar eco de eventos
const SESSION_ID = uuidv4();
console.log('Sync Session ID:', SESSION_ID);

let realtimeChannel: any = null;

/**
 * Aplica uma única alteração ao estado local dos dados.
 * @param localData O estado atual dos dados.
 * @param change O evento de alteração a ser aplicado.
 * @returns O novo estado dos dados após a alteração.
 */
const applyChange = (localData: StorageItems, change: ItemChange): StorageItems => {
    const { item_type, change_type, item_id, data } = change;
    // Clonar profundamente para evitar mutações inesperadas
    const updatedData = JSON.parse(JSON.stringify(localData));

    switch (item_type) {
        case 'expenses':
            const expense = data as Expense;
            const category = expense.category;
            if (!updatedData.expenses[category]) updatedData.expenses[category] = [];

            if (change_type === 'delete') {
                updatedData.expenses[category] = updatedData.expenses[category].filter(e => e.id !== item_id);
            } else {
                const index = updatedData.expenses[category].findIndex(e => e.id === item_id);
                if (index > -1) {
                    updatedData.expenses[category][index] = expense; // Atualizar
                } else {
                    updatedData.expenses[category].push(expense); // Adicionar
                }
            }
            break;

        case 'projects':
            const project = data as Project;
            if (change_type === 'delete') {
                updatedData.projects = updatedData.projects.filter(p => p.id !== item_id);
            } else {
                const index = updatedData.projects.findIndex(p => p.id === item_id);
                if (index > -1) {
                    updatedData.projects[index] = project; // Atualizar
                } else {
                    updatedData.projects.push(project); // Adicionar
                }
            }
            break;

        case 'stock':
            const stockItem = data as StockItem;
            if (change_type === 'delete') {
                updatedData.stock = updatedData.stock.filter(s => s.id !== item_id);
            } else {
                const index = updatedData.stock.findIndex(s => s.id === item_id);
                if (index > -1) {
                    updatedData.stock[index] = stockItem; // Atualizar
                } else {
                    updatedData.stock.push(stockItem); // Adicionar
                }
            }
            break;

        case 'employees':
            const employee = data as Employee;
            const weekKey = employee.weekStartDate;
            if (!updatedData.employees[weekKey]) updatedData.employees[weekKey] = [];

            if (change_type === 'delete') {
                updatedData.employees[weekKey] = updatedData.employees[weekKey].filter(e => e.id !== item_id);
            } else {
                const index = updatedData.employees[weekKey].findIndex(e => e.id === item_id);
                if (index > -1) {
                    updatedData.employees[weekKey][index] = employee; // Atualizar
                } else {
                    updatedData.employees[weekKey].push(employee); // Adicionar
                }
            }
            break;

        case 'willSettings':
             if (change_type === 'update') {
                const { willBaseRate, willBonus } = data;
                if (willBaseRate !== undefined) updatedData.willBaseRate = willBaseRate;
                if (willBonus !== undefined) updatedData.willBonus = willBonus;
            }
            break;
    }
    return updatedData;
};


/**
 * Salva uma alteração de item, aplicando-a localmente e enviando-a para o Supabase.
 * @param item_type O tipo de item (ex: 'expenses').
 * @param item_data Os dados do item a ser salvo.
 * @param change_type O tipo de alteração ('add', 'update', 'delete').
 * @param list_name Nome da lista (para despesas e funcionários).
 */
export const saveItem = async (
    item_type: ItemType,
    item_data: any,
    change_type: ChangeType,
    list_name?: string
) => {
    if (!supabase) {
        console.error("Supabase client is not initialized.");
        return;
    }

    const item_id = item_data.id;
    if (!item_id) {
        console.error("Item data must have an 'id' property.", item_data);
        return;
    }

    const change: ItemChange = {
        id: uuidv4(),
        item_id,
        item_type,
        change_type,
        data: item_data,
        timestamp: Date.now(),
        session_id: SESSION_ID,
        list_name: list_name || null,
    };

    try {
        // 1. Aplicar a mudança localmente para feedback instantâneo da UI
        const localData = await storage.load();
        const updatedLocalData = applyChange(localData, change);
        await storage.save(updatedLocalData);
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: updatedLocalData }));

        // 2. Enviar a mudança para o Supabase
        const { error } = await supabase.from('item_changes').insert(change);
        if (error) {
            console.error('Error saving change to Supabase:', error);
            // TODO: Implementar uma fila de fallback para tentativas futuras se o envio falhar.
        } else {
            console.log(`Change [${change_type}] for item [${item_id}] saved to Supabase.`);
        }
    } catch (error) {
        console.error('Error in saveItem:', error);
    }
};

/**
 * Processa as alterações recebidas em tempo real do Supabase.
 */
const handleRealtimeChange = async (payload: any) => {
    const change = payload.new as ItemChange;
    console.log('Realtime change received:', change);

    // Ignorar eventos da própria sessão para evitar loops
    if (change.session_id === SESSION_ID) {
        console.log('Ignoring own change.');
        return;
    }

    const localData = await storage.load();

    // Verificar se a mudança já não está aplicada (baseado no timestamp)
    if (change.timestamp <= (localData.lastSync || 0)) {
        console.log('Ignoring old change.');
        return;
    }

    const updatedData = applyChange(localData, change);
    updatedData.lastSync = change.timestamp; // Atualizar o timestamp da última sincronização

    await storage.save(updatedData);
    window.dispatchEvent(new CustomEvent('dataUpdated', { detail: updatedData }));
    console.log('Applied remote change locally.');
};

/**
 * Realiza uma sincronização completa, buscando todas as alterações desde a última sincronização.
 */
export const fullSync = async () => {
    if (!supabase) return;

    console.log('Starting full sync...');
    const localData = await storage.load();
    const lastSync = localData.lastSync || 0;

    const { data: changes, error } = await supabase
        .from('item_changes')
        .select('*')
        .gt('timestamp', lastSync)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error('Error fetching changes for full sync:', error);
        return;
    }

    if (!changes || changes.length === 0) {
        console.log('No new changes to sync.');
        return;
    }

    console.log(`Found ${changes.length} new changes to apply.`);

    let updatedData = localData;
    for (const change of changes) {
        // Não aplicar mudanças da própria sessão que já foram aplicadas localmente
        if (change.session_id !== SESSION_ID) {
             updatedData = applyChange(updatedData, change as ItemChange);
        }
    }

    // Atualizar o timestamp da última sincronização para o da última mudança processada
    updatedData.lastSync = changes[changes.length - 1].timestamp;

    await storage.save(updatedData);
    window.dispatchEvent(new CustomEvent('dataUpdated', { detail: updatedData }));
    console.log('Full sync completed.');
};

/**
 * Inicializa o serviço de sincronização.
 */
export const initSyncService = () => {
    if (!supabase || realtimeChannel) {
        return;
    }

    console.log('Initializing sync service...');

    realtimeChannel = supabase
        .channel('item_changes_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'item_changes' }, handleRealtimeChange)
        .subscribe((status: string) => {
            console.log(`Supabase realtime channel status: ${status}`);
            if (status === 'SUBSCRIBED') {
                // Ao se conectar, fazer uma sincronização completa para garantir que não perdemos nada
                fullSync();
            }
        });

    // Listener para reconectar e sincronizar quando a aba do navegador se torna visível
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('App is visible again, performing full sync.');
            fullSync();
        }
    });
};

/**
 * Para o serviço de sincronização.
 */
export const stopSyncService = () => {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
        console.log('Sync service stopped.');
    }
};
