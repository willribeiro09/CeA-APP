import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { storage, StorageData } from './storage';
import { Expense, Project, StockItem, Employee } from '../types';

// Evento personalizado para mudanças no status da conexão
export const CONNECTION_STATUS_EVENT = 'supabase-connection-status';

// Status da conexão
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

// Dispara um evento personalizado com o status da conexão
export const dispatchConnectionStatus = (status: ConnectionStatus) => {
  const event = new CustomEvent(CONNECTION_STATUS_EVENT, { detail: status });
  window.dispatchEvent(event);
};

// Verifica se o Supabase está conectado
export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    dispatchConnectionStatus('disconnected');
    return false;
  }
  
  try {
    const { data, error } = await supabase.from('expenses').select('id').limit(1);
    
    if (error) {
      console.error('Erro ao verificar conexão com Supabase:', error);
      dispatchConnectionStatus('disconnected');
      return false;
    }
    
    dispatchConnectionStatus('connected');
    return true;
  } catch (error) {
    console.error('Erro ao verificar conexão com Supabase:', error);
    dispatchConnectionStatus('disconnected');
    return false;
  }
};

// Tipo para a função de inicialização da sincronização
export type InitSyncFunction = (
  onExpensesChange: (expenses: Record<string, Expense[]>) => void,
  onProjectsChange: (projects: Project[]) => void,
  onStockChange: (stock: StockItem[]) => void,
  onEmployeesChange: (employees: Record<string, Employee[]>) => void
) => () => void;

// Função para sincronizar dados locais com o Supabase
export const syncService = (): InitSyncFunction => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase não configurado. A sincronização não será iniciada.');
    return () => () => {};
  }

  dispatchConnectionStatus('connecting');
  console.log('Iniciando serviço de sincronização...');

  let onExpensesChangeCallback: ((expenses: Record<string, Expense[]>) => void) | null = null;
  let onProjectsChangeCallback: ((projects: Project[]) => void) | null = null;
  let onStockChangeCallback: ((stock: StockItem[]) => void) | null = null;
  let onEmployeesChangeCallback: ((employees: Record<string, Employee[]>) => void) | null = null;

  // Função para buscar despesas
  const fetchExpenses = async () => {
    try {
      console.log('Buscando despesas do Supabase...');
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar despesas:', error);
        return;
      }

      console.log('Despesas recebidas do Supabase:', data);

      // Organiza as despesas por lista
      const expenses: Record<string, Expense[]> = {};
      data.forEach((expense: any) => {
        const listName = expense.list_name;
        if (!expenses[listName]) {
          expenses[listName] = [];
        }
        expenses[listName].push({
          id: expense.id,
          name: expense.name,
          category: 'Expenses',
          amount: expense.amount,
          paid: expense.paid,
          date: new Date(expense.date),
          dueDate: new Date(expense.due_date || expense.date)
        });
      });

      console.log('Despesas organizadas por lista:', expenses);

      // Atualiza o armazenamento local
      const storageData = storage.getData();
      storageData.items.expenses = expenses as any;
      storage.saveData(storageData);

      // Notifica sobre a mudança
      if (onExpensesChangeCallback) {
        console.log('Notificando sobre mudança nas despesas');
        onExpensesChangeCallback(expenses);
      } else {
        console.warn('Callback de despesas não está definido');
      }
    } catch (error) {
      console.error('Erro ao processar despesas:', error);
    }
  };

  // Função para buscar projetos
  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar projetos:', error);
        return;
      }

      const projects: Project[] = data.map((project: any) => ({
        id: project.id,
        name: project.name,
        category: 'Projects',
        description: project.description,
        status: project.status,
        startDate: new Date(project.start_date)
      }));

      // Atualiza o armazenamento local
      const storageData = storage.getData();
      storageData.items.projects = projects;
      storage.saveData(storageData);

      // Notifica sobre a mudança
      if (onProjectsChangeCallback) {
        onProjectsChangeCallback(projects);
      }
    } catch (error) {
      console.error('Erro ao processar projetos:', error);
    }
  };

  // Função para buscar itens de estoque
  const fetchStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar itens de estoque:', error);
        return;
      }

      const stockItems: StockItem[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: 'Stock',
        quantity: item.quantity
      }));

      // Atualiza o armazenamento local
      const storageData = storage.getData();
      storageData.items.stock = stockItems;
      storage.saveData(storageData);

      // Notifica sobre a mudança
      if (onStockChangeCallback) {
        onStockChangeCallback(stockItems);
      }
    } catch (error) {
      console.error('Erro ao processar itens de estoque:', error);
    }
  };

  // Função para buscar funcionários
  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('week_start_date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar funcionários:', error);
        return;
      }

      // Organiza os funcionários por semana
      const employees: Record<string, Employee[]> = {};
      data.forEach((employee: any) => {
        const weekStartDate = new Date(employee.week_start_date).toISOString().split('T')[0];
        if (!employees[weekStartDate]) {
          employees[weekStartDate] = [];
        }
        employees[weekStartDate].push({
          id: employee.id,
          name: employee.employee_name,
          category: 'Employees',
          employeeName: employee.employee_name,
          daysWorked: employee.days_worked,
          weekStartDate: new Date(employee.week_start_date),
          dailyRate: employee.daily_rate
        });
      });

      // Atualiza o armazenamento local
      const storageData = storage.getData();
      storageData.items.employees = employees as any;
      storage.saveData(storageData);

      // Notifica sobre a mudança
      if (onEmployeesChangeCallback) {
        onEmployeesChangeCallback(employees);
      }
    } catch (error) {
      console.error('Erro ao processar funcionários:', error);
    }
  };

  // Adiciona manipuladores de eventos para monitorar o status da conexão
  const channel = supabase.channel('db-changes', {
    config: {
      broadcast: {
        self: false
      }
    }
  });
  
  // Função para buscar dados iniciais
  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchExpenses(),
        fetchProjects(),
        fetchStockItems(),
        fetchEmployees()
      ]);
      console.log('Dados iniciais carregados com sucesso');
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };
  
  channel
    .on('system', { event: 'disconnect' }, () => {
      console.log('Desconectado do Supabase Realtime');
      dispatchConnectionStatus('disconnected');
    })
    .on('system', { event: 'reconnect' }, () => {
      console.log('Reconectando ao Supabase Realtime');
      dispatchConnectionStatus('connecting');
    })
    .on('system', { event: 'connected' }, () => {
      console.log('Conectado ao Supabase Realtime');
      dispatchConnectionStatus('connected');
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public',
      table: 'expenses' 
    }, (payload) => {
      console.log('Mudanças detectadas na tabela expenses:', payload);
      fetchExpenses();
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public',
      table: 'projects' 
    }, (payload) => {
      console.log('Mudanças detectadas na tabela projects:', payload);
      fetchProjects();
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public',
      table: 'stock_items' 
    }, (payload) => {
      console.log('Mudanças detectadas na tabela stock_items:', payload);
      fetchStockItems();
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public',
      table: 'employees' 
    }, (payload) => {
      console.log('Mudanças detectadas na tabela employees:', payload);
      fetchEmployees();
    })
    .subscribe((status) => {
      console.log('Status da inscrição:', status);
      
      if (status === 'SUBSCRIBED') {
        // Busca dados iniciais após a inscrição bem-sucedida
        fetchInitialData();
      }
    });

  // Função para iniciar a sincronização em tempo real
  const initRealtimeSync: InitSyncFunction = (
    onExpensesChange,
    onProjectsChange,
    onStockChange,
    onEmployeesChange
  ) => {
    console.log('Iniciando sincronização em tempo real...');
    
    // Armazena os callbacks para uso posterior
    onExpensesChangeCallback = onExpensesChange;
    onProjectsChangeCallback = onProjectsChange;
    onStockChangeCallback = onStockChange;
    onEmployeesChangeCallback = onEmployeesChange;

    console.log('Callbacks configurados:', {
      expenses: !!onExpensesChangeCallback,
      projects: !!onProjectsChangeCallback,
      stock: !!onStockChangeCallback,
      employees: !!onEmployeesChangeCallback
    });

    // Busca dados iniciais
    fetchInitialData();

    // Configura um intervalo para atualizar os dados periodicamente
    // como solução alternativa caso o Realtime não funcione
    const refreshInterval = setInterval(() => {
      console.log('Atualizando dados periodicamente...');
      fetchInitialData();
    }, 10000); // Atualiza a cada 10 segundos

    // Retorna uma função para cancelar a inscrição
    return () => {
      console.log('Encerrando serviço de sincronização...');
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
      dispatchConnectionStatus('disconnected');
    };
  };

  return initRealtimeSync;
};

// Busca e atualiza as despesas
export const fetchAndUpdateExpenses = async (onExpensesChange: (expenses: Record<string, Expense[]>) => void) => {
  try {
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .order('due_date', { ascending: true });
    
    if (expensesError) {
      console.error('Erro ao buscar despesas:', expensesError);
      return;
    }

    // Organiza as despesas por lista
    const expenses: Record<string, Expense[]> = {
      'Carlos': [],
      'Diego': [],
      'C&A': []
    };

    expensesData.forEach((expense: any) => {
      const list = expense.list_name;
      if (expenses[list]) {
        expenses[list].push({
          id: expense.id,
          name: expense.name,
          amount: expense.amount,
          paid: expense.paid,
          dueDate: new Date(expense.due_date),
          category: 'Expenses',
          date: new Date(expense.date)
        });
      }
    });

    // Atualiza o estado da aplicação
    onExpensesChange(expenses);
  } catch (error) {
    console.error('Erro ao processar despesas:', error);
  }
};

// Busca e atualiza os projetos
export const fetchAndUpdateProjects = async (onProjectsChange: (projects: Project[]) => void) => {
  try {
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (projectsError) {
      console.error('Erro ao buscar projetos:', projectsError);
      return;
    }

    const projects: Project[] = projectsData.map((project: any) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: new Date(project.start_date),
      category: 'Projects'
    }));

    onProjectsChange(projects);
  } catch (error) {
    console.error('Erro ao processar projetos:', error);
  }
};

// Busca e atualiza os itens de estoque
export const fetchAndUpdateStock = async (onStockChange: (stock: StockItem[]) => void) => {
  try {
    const { data: stockData, error: stockError } = await supabase
      .from('stock_items')
      .select('*')
      .order('name', { ascending: true });
    
    if (stockError) {
      console.error('Erro ao buscar itens de estoque:', stockError);
      return;
    }

    const stock: StockItem[] = stockData.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      category: 'Stock'
    }));

    onStockChange(stock);
  } catch (error) {
    console.error('Erro ao processar itens de estoque:', error);
  }
};

// Busca e atualiza os funcionários
export const fetchAndUpdateEmployees = async (onEmployeesChange: (employees: Record<string, Employee[]>) => void) => {
  try {
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('week_start_date', { ascending: false });
    
    if (employeesError) {
      console.error('Erro ao buscar funcionários:', employeesError);
      return;
    }

    // Organiza os funcionários por semana
    const employees: Record<string, Employee[]> = {};
    
    employeesData.forEach((employee: any) => {
      const weekStartDate = new Date(employee.week_start_date).toISOString().split('T')[0];
      
      if (!employees[weekStartDate]) {
        employees[weekStartDate] = [];
      }
      
      employees[weekStartDate].push({
        id: employee.id,
        name: employee.employee_name,
        employeeName: employee.employee_name,
        daysWorked: employee.days_worked,
        weekStartDate: new Date(employee.week_start_date),
        dailyRate: employee.daily_rate,
        category: 'Employees'
      });
    });

    // Atualiza o estado da aplicação
    onEmployeesChange(employees);
  } catch (error) {
    console.error('Erro ao processar funcionários:', error);
  }
};

// Carrega dados iniciais do Supabase
export const loadInitialData = async (): Promise<StorageData | null> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase não está configurado. Usando dados locais.');
    return null;
  }

  try {
    // Busca despesas
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    
    if (expensesError) throw expensesError;

    // Busca projetos
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (projectsError) throw projectsError;

    // Busca itens de estoque
    const { data: stockData, error: stockError } = await supabase
      .from('stock_items')
      .select('*')
      .order('name', { ascending: true });
    
    if (stockError) throw stockError;

    // Busca funcionários
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('week_start_date', { ascending: false });
    
    if (employeesError) throw employeesError;

    // Organiza as despesas por lista
    const expenses: Record<string, Expense[]> = {};
    expensesData.forEach((expense: any) => {
      const listName = expense.list_name;
      if (!expenses[listName]) {
        expenses[listName] = [];
      }
      expenses[listName].push({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        paid: expense.paid,
        dueDate: new Date(expense.due_date),
        category: 'Expenses',
        date: new Date(expense.date)
      });
    });

    // Converte projetos
    const projects: Project[] = projectsData.map((project: any) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: new Date(project.start_date),
      category: 'Projects'
    }));

    // Converte itens de estoque
    const stockItems: StockItem[] = stockData.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      category: 'Stock'
    }));

    // Organiza os funcionários por semana
    const employees: Record<string, Employee[]> = {};

    employeesData.forEach((employee: any) => {
      const weekStartDate = new Date(employee.week_start_date).toISOString().split('T')[0];
      
      if (!employees[weekStartDate]) {
        employees[weekStartDate] = [];
      }
      
      employees[weekStartDate].push({
        id: employee.id,
        name: employee.employee_name,
        employeeName: employee.employee_name,
        daysWorked: employee.days_worked,
        weekStartDate: new Date(employee.week_start_date),
        dailyRate: employee.daily_rate,
        category: 'Employees'
      });
    });

    // Retorna os dados organizados
    return {
      items: {
        expenses,
        projects,
        stock: stockItems,
        employees
      }
    };
  } catch (error) {
    console.error('Erro ao carregar dados do Supabase:', error);
    return null;
  }
};

// Salva dados no Supabase
export const saveData = async (data: StorageData): Promise<void> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase não está configurado. Salvando apenas localmente.');
    storage.saveData(data);
    return;
  }

  try {
    // Salva localmente primeiro
    storage.saveData(data);

    // Salva despesas no Supabase
    for (const [listName, expenses] of Object.entries(data.items.expenses)) {
      for (const expense of expenses) {
        try {
          const { error } = await supabase
            .from('expenses')
            .upsert({
              id: expense.id,
              name: expense.name,
              amount: expense.amount,
              paid: expense.paid,
              due_date: expense.dueDate.toISOString(),
              date: expense.date.toISOString(),
              list_name: listName
            });
          
          if (error) {
            console.error(`Erro ao salvar despesa ${expense.id}:`, error);
          }
        } catch (err) {
          console.error(`Erro ao processar despesa ${expense.id}:`, err);
        }
      }
    }

    // Salva projetos no Supabase
    for (const project of data.items.projects) {
      try {
        const { error } = await supabase
          .from('projects')
          .upsert({
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            start_date: project.startDate.toISOString()
          });
        
        if (error) {
          console.error(`Erro ao salvar projeto ${project.id}:`, error);
        }
      } catch (err) {
        console.error(`Erro ao processar projeto ${project.id}:`, err);
      }
    }

    // Salva itens de estoque no Supabase
    for (const item of data.items.stock) {
      try {
        const { error } = await supabase
          .from('stock_items')
          .upsert({
            id: item.id,
            name: item.name,
            quantity: item.quantity
          });
        
        if (error) {
          console.error(`Erro ao salvar item de estoque ${item.id}:`, error);
        }
      } catch (err) {
        console.error(`Erro ao processar item de estoque ${item.id}:`, err);
      }
    }

    // Salva funcionários no Supabase
    for (const [weekStartDate, employees] of Object.entries(data.items.employees)) {
      for (const employee of employees) {
        try {
          const { error } = await supabase
            .from('employees')
            .upsert({
              id: employee.id,
              employee_name: employee.employeeName,
              days_worked: employee.daysWorked,
              week_start_date: employee.weekStartDate.toISOString(),
              daily_rate: employee.dailyRate
            });
          
          if (error) {
            console.error(`Erro ao salvar funcionário ${employee.id}:`, error);
          }
        } catch (err) {
          console.error(`Erro ao processar funcionário ${employee.id}:`, err);
        }
      }
    }

    console.log('Todos os dados foram salvos no Supabase com sucesso');
    
    // Dispara evento de conexão bem-sucedida
    dispatchConnectionStatus('connected');
  } catch (error) {
    console.error('Erro ao salvar dados no Supabase:', error);
    // Dispara evento de conexão falha
    dispatchConnectionStatus('disconnected');
    // Continua usando os dados locais
  }
}; 