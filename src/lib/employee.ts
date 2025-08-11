import { Employee } from '../types';
import { saveItem, ITEM_TYPE, CHANGE_TYPE } from './sync';

export async function updateEmployee(employee: Employee) {
  try {
    // Just save the change. The UI state will be updated via the realtime listener.
    await saveItem(ITEM_TYPE.EMPLOYEES, employee, CHANGE_TYPE.UPDATE);
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
}
