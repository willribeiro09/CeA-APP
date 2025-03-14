import React from 'react';
import { useAppContext } from '../context/AppContext';
import { StockItem } from '../types';

/**
 * Componente para exibir a lista de itens de estoque
 */
export function StockList() {
  const { stock, ui } = useAppContext();
  
  // Função para adicionar um novo item ao estoque
  const handleAddStockItem = () => {
    ui.openAddDialog();
  };
  
  // Função para editar um item do estoque
  const handleEditStockItem = (item: StockItem) => {
    // Implementar lógica de edição
    console.log('Editar item:', item);
  };
  
  // Função para excluir um item do estoque
  const handleDeleteStockItem = (id: string) => {
    stock.deleteStockItem(id);
  };
  
  // Função para incrementar a quantidade de um item
  const handleIncrementQuantity = (id: string) => {
    stock.incrementQuantity(id);
  };
  
  // Função para decrementar a quantidade de um item
  const handleDecrementQuantity = (id: string) => {
    stock.decrementQuantity(id);
  };
  
  return (
    <div className="stock-list">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Estoque</h2>
        <button
          onClick={handleAddStockItem}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Adicionar Item
        </button>
      </div>
      
      {stock.stock.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">Nenhum item encontrado no estoque.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Nome</th>
                <th className="py-2 px-4 border-b text-left">Descrição</th>
                <th className="py-2 px-4 border-b text-left">Quantidade</th>
                <th className="py-2 px-4 border-b text-left">Preço</th>
                <th className="py-2 px-4 border-b text-left">Categoria</th>
                <th className="py-2 px-4 border-b text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {stock.stock.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{item.name}</td>
                  <td className="py-2 px-4">{item.description}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleDecrementQuantity(item.id)}
                        className="p-1 bg-gray-100 rounded-md mr-2"
                        disabled={item.quantity <= 0}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => handleIncrementQuantity(item.id)}
                        className="p-1 bg-gray-100 rounded-md ml-2"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(item.price)}
                  </td>
                  <td className="py-2 px-4">{item.category}</td>
                  <td className="py-2 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditStockItem(item)}
                        className="p-1 bg-blue-100 text-blue-800 rounded-md"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteStockItem(item.id)}
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
      
      {/* Valor total do estoque */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-lg font-semibold">
          Valor Total do Estoque: {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(
            stock.stock.reduce((total, item) => total + (item.price * item.quantity), 0)
          )}
        </p>
      </div>
    </div>
  );
} 