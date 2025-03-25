import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { executeMigration } from '../lib/executeMigration';

/**
 * Componente que gerencia a migração do banco de dados para a nova estrutura
 * - Exibe o progresso da migração
 * - Permite ao usuário iniciar a migração manualmente
 * - Notifica quando a migração é concluída
 */
export const DatabaseMigration = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'in_progress' | 'completed' | 'failed'>('pending');
  const [migrationMessage, setMigrationMessage] = useState('');
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Verificar se a migração é necessária
  useEffect(() => {
    const checkMigrationNeeded = async () => {
      if (!supabase) return;
      
      try {
        // Verificar se as tabelas novas existem
        const { data: newTablesData, error: newTablesError } = await supabase
          .from('projects')
          .select('id')
          .limit(1);
        
        // Se não há erro, a tabela existe, verificar se tem dados
        if (!newTablesError) {
          const { data: tablesWithData, error: countError } = await supabase
            .rpc('count_records_in_new_tables');
          
          if (!countError && tablesWithData && tablesWithData.total_records > 0) {
            // Já migrado com sucesso
            setMigrationStatus('completed');
            setMigrationMessage('Banco de dados já está na nova estrutura');
            return;
          }
        }
        
        // Verificar se a tabela antiga sync_data existe e tem dados
        const { data: oldTableData, error: oldTableError } = await supabase
          .from('sync_data')
          .select('id')
          .limit(1);
        
        if (!oldTableError && oldTableData && oldTableData.length > 0) {
          // Migração necessária, mostrar modal
          setShowModal(true);
        } else {
          // Não há dados para migrar, mas pode ser necessário criar a estrutura
          setMigrationStatus('pending');
          setMigrationMessage('Nova estrutura de banco de dados será criada durante a inicialização');
        }
      } catch (error) {
        console.error('Erro ao verificar necessidade de migração:', error);
      }
    };
    
    checkMigrationNeeded();
  }, []);

  // Função para iniciar a migração
  const startMigration = async () => {
    if (isMigrating) return;
    
    setIsMigrating(true);
    setMigrationStatus('in_progress');
    setMigrationMessage('Iniciando migração...');
    setMigrationProgress(5);
    
    try {
      // Usar nova função de migração que implementa tudo num só processo
      setMigrationMessage('Executando processo de migração...');
      setMigrationProgress(20);
      
      const result = await executeMigration();
      
      if (result.success) {
        setMigrationStatus('completed');
        setMigrationMessage(result.message);
        setMigrationProgress(100);
        
        // Exibir detalhes no console
        console.log('Detalhes da migração:', result.details);
        
        // Esconder modal após 3 segundos
        setTimeout(() => {
          setShowModal(false);
        }, 3000);
      } else {
        setMigrationStatus('failed');
        setMigrationMessage(result.message);
        setMigrationProgress(0);
        console.error('Falha na migração:', result.details);
      }
    } catch (error) {
      console.error('Erro durante a migração:', error);
      setMigrationStatus('failed');
      setMigrationMessage('Erro durante a migração. Verifique o console para mais detalhes.');
      setMigrationProgress(0);
    } finally {
      setIsMigrating(false);
    }
  };

  // Renderizar nada se não estiver mostrando o modal
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Atualização de Banco de Dados</h2>
        
        <p className="mb-4">
          Uma atualização do banco de dados é necessária para melhorar a sincronização e evitar perda de dados.
          Esta operação é segura e não apagará seus dados existentes.
        </p>
        
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${migrationStatus === 'failed' ? 'bg-red-600' : 'bg-green-600'}`}
              style={{ width: `${migrationProgress}%` }}
            ></div>
          </div>
          <p className="text-sm mt-1 text-gray-600">{migrationMessage}</p>
        </div>
        
        <div className="flex justify-end gap-2">
          {migrationStatus === 'completed' ? (
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Concluído
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowModal(false)}
                disabled={isMigrating}
                className={`px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${isMigrating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Mais tarde
              </button>
              <button
                onClick={startMigration}
                disabled={isMigrating}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${isMigrating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isMigrating ? 'Migrando...' : 'Atualizar Agora'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Função RPC para contar registros nas novas tabelas
// Esta função deve ser criada no banco de dados
/*
CREATE OR REPLACE FUNCTION count_records_in_new_tables()
RETURNS jsonb AS $$
DECLARE
  projects_count INTEGER;
  expenses_count INTEGER;
  stock_items_count INTEGER;
  employees_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO projects_count FROM projects;
  SELECT COUNT(*) INTO expenses_count FROM expenses;
  SELECT COUNT(*) INTO stock_items_count FROM stock_items;
  SELECT COUNT(*) INTO employees_count FROM employees;
  
  total_count := projects_count + expenses_count + stock_items_count + employees_count;
  
  RETURN jsonb_build_object(
    'projects', projects_count,
    'expenses', expenses_count,
    'stock_items', stock_items_count,
    'employees', employees_count,
    'total_records', total_count
  );
EXCEPTION WHEN OTHERS THEN
  -- Se ocorrer erro, provavelmente as tabelas não existem ainda
  RETURN jsonb_build_object(
    'projects', 0,
    'expenses', 0,
    'stock_items', 0,
    'employees', 0,
    'total_records', 0
  );
END;
$$ LANGUAGE plpgsql;
*/

export default DatabaseMigration; 