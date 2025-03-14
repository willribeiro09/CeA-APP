import { useState, useCallback, useEffect } from 'react';
import { StockItem } from '../types';
import { getData, saveData } from '../utils/storageUtils';

/**
 * Hook para gerenciar os itens de estoque
 */
export function useStock() {
  // Estado para armazenar os itens de estoque
  const [stock, setStock] = useState<StockItem[]>([]);
  
  // Carrega os itens de estoque do armazenamento local
  useEffect(() => {
    const data = getData();
    if (data && data.stock) {
      setStock(data.stock);
    }
  }, []);
  
  // Adiciona um novo item ao estoque
  const addStockItem = useCallback((item: Partial<StockItem>): void => {
    // Verifica se todos os campos obrigatórios estão preenchidos
    if (!item.name || item.quantity === undefined) {
      console.error('Dados incompletos para adicionar item ao estoque');
      return;
    }
    
    setStock(prevStock => {
      // Cria um novo array para evitar mutação do estado anterior
      const newItem: StockItem = {
        id: Date.now().toString(),
        name: item.name!,
        description: item.description || '',
        quantity: item.quantity!,
        price: item.price || 0,
        category: item.category || 'Geral',
        unit: item.unit || 'un'
      };
      
      const updatedStock = [...prevStock, newItem];
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        stock: updatedStock
      });
      
      return updatedStock;
    });
  }, []);
  
  // Atualiza um item existente no estoque
  const updateStockItem = useCallback((id: string, updatedItem: Partial<StockItem>): void => {
    setStock(prevStock => {
      // Encontra o índice do item
      const itemIndex = prevStock.findIndex(item => item.id === id);
      
      // Verifica se o item existe
      if (itemIndex === -1) {
        console.error(`Item com ID ${id} não encontrado no estoque`);
        return prevStock;
      }
      
      // Cria um novo array para evitar mutação do estado anterior
      const updatedStock = [...prevStock];
      
      // Atualiza o item
      updatedStock[itemIndex] = {
        ...updatedStock[itemIndex],
        ...updatedItem
      };
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        stock: updatedStock
      });
      
      return updatedStock;
    });
  }, []);
  
  // Remove um item do estoque
  const deleteStockItem = useCallback((id: string): void => {
    setStock(prevStock => {
      // Cria um novo array para evitar mutação do estado anterior
      const updatedStock = prevStock.filter(item => item.id !== id);
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        stock: updatedStock
      });
      
      return updatedStock;
    });
  }, []);
  
  // Incrementa a quantidade de um item no estoque
  const incrementQuantity = useCallback((id: string): void => {
    setStock(prevStock => {
      // Encontra o índice do item
      const itemIndex = prevStock.findIndex(item => item.id === id);
      
      // Verifica se o item existe
      if (itemIndex === -1) {
        console.error(`Item com ID ${id} não encontrado no estoque`);
        return prevStock;
      }
      
      // Cria um novo array para evitar mutação do estado anterior
      const updatedStock = [...prevStock];
      
      // Incrementa a quantidade
      updatedStock[itemIndex] = {
        ...updatedStock[itemIndex],
        quantity: updatedStock[itemIndex].quantity + 1
      };
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        stock: updatedStock
      });
      
      return updatedStock;
    });
  }, []);
  
  // Decrementa a quantidade de um item no estoque
  const decrementQuantity = useCallback((id: string): void => {
    setStock(prevStock => {
      // Encontra o índice do item
      const itemIndex = prevStock.findIndex(item => item.id === id);
      
      // Verifica se o item existe
      if (itemIndex === -1) {
        console.error(`Item com ID ${id} não encontrado no estoque`);
        return prevStock;
      }
      
      // Verifica se a quantidade é maior que zero
      if (prevStock[itemIndex].quantity <= 0) {
        console.error(`Quantidade do item ${id} já é zero`);
        return prevStock;
      }
      
      // Cria um novo array para evitar mutação do estado anterior
      const updatedStock = [...prevStock];
      
      // Decrementa a quantidade
      updatedStock[itemIndex] = {
        ...updatedStock[itemIndex],
        quantity: updatedStock[itemIndex].quantity - 1
      };
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        stock: updatedStock
      });
      
      return updatedStock;
    });
  }, []);
  
  return {
    stock,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    incrementQuantity,
    decrementQuantity
  };
} 