import { supabase } from '../supabase';
import { ChangeEvent, ChangeTypeValue } from './types';
import { SESSION_ID, generateChangeId } from './eventHandlers';

// Publicar um evento de alteração
export const publishChangeEvent = async (
  itemType: ChangeEvent['itemType'],
  itemId: string,
  changeType: ChangeTypeValue,
  data: any | null,
  listName?: string
): Promise<boolean> => {
  if (!supabase) {
    console.warn('Supabase não configurado, não é possível publicar evento de alteração');
    return false;
  }
  
  const changeEvent: ChangeEvent = {
    id: generateChangeId(),
    itemId,
    itemType,
    changeType,
    data,
    timestamp: Date.now(),
    sessionId: SESSION_ID,
    listName
  };
  
  console.log('Publicando evento de alteração:', changeEvent);
  
  try {
    const { error } = await supabase
      .from('item_changes')
      .insert(changeEvent);
    
    if (error) {
      console.error('Erro ao publicar evento de alteração:', error);
      return false;
    }
    
    console.log('Evento de alteração publicado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao publicar evento de alteração:', error);
    return false;
  }
}; 