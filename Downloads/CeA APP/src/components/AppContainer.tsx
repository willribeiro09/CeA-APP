import React, { useEffect } from 'react';
import { AppProvider } from '../context/AppContext';
import { MainContent } from './MainContent';

/**
 * Componente para inicializar efeitos globais
 */
function AppInitializer() {
  // Efeito para inicializar a sincronização
  useEffect(() => {
    // Implementar inicialização da sincronização
    console.log('Inicializando sincronização...');
  }, []);
  
  return null;
}

/**
 * Componente principal que envolve toda a aplicação
 */
export function AppContainer() {
  return (
    <AppProvider>
      <div className="app-container min-h-screen bg-gray-50">
        <header className="bg-blue-700 text-white shadow-md">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">CeA App</h1>
              <div className="flex items-center space-x-4">
                <button className="px-3 py-1 bg-blue-600 rounded-md hover:bg-blue-500">
                  Sincronizar
                </button>
                <button className="px-3 py-1 bg-blue-600 rounded-md hover:bg-blue-500">
                  Configurações
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="py-6">
          <MainContent />
        </main>
        
        <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                &copy; {new Date().getFullYear()} CeA App
              </p>
              <p className="text-sm text-gray-600">
                Versão 1.0.0
              </p>
            </div>
          </div>
        </footer>
        
        <AppInitializer />
      </div>
    </AppProvider>
  );
} 