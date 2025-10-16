import { Search, X, DollarSign, Briefcase, Package, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Expense, Project, StockItem, Employee } from '../types';

interface SearchResult {
  id: string;
  type: 'expense' | 'project' | 'stock' | 'employee';
  title: string;
  subtitle?: string;
  data: any;
}

interface SearchDropdownProps {
  expenses: Record<string, Expense[]>;
  projects: Project[];
  stockItems: StockItem[];
  employees: Record<string, Employee[]>;
  onSearchResultClick?: (result: SearchResult) => void;
}

export function SearchDropdown({ 
  expenses, 
  projects, 
  stockItems, 
  employees,
  onSearchResultClick 
}: SearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Busca em tempo real
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    const results: SearchResult[] = [];

    // Buscar em Despesas
    Object.entries(expenses).forEach(([list, expenseList]) => {
      expenseList.forEach(expense => {
        const matchDescription = expense.description?.toLowerCase().includes(term);
        const matchCategory = expense.category?.toLowerCase().includes(term);
        const matchNotes = expense.notes?.toLowerCase().includes(term);
        const matchAmount = expense.amount?.toString().includes(term);

        if (matchDescription || matchCategory || matchNotes || matchAmount) {
          results.push({
            id: expense.id,
            type: 'expense',
            title: expense.description || 'Sem descrição',
            subtitle: `${list} - R$ ${expense.amount?.toFixed(2)} - ${expense.category}`,
            data: expense
          });
        }
      });
    });

    // Buscar em Projetos
    projects.forEach(project => {
      const matchName = project.name?.toLowerCase().includes(term);
      const matchClient = project.client?.toLowerCase().includes(term);
      const matchDescription = project.description?.toLowerCase().includes(term);
      const matchLocation = project.location?.toLowerCase().includes(term);
      const matchProjectNumber = project.projectNumber?.toLowerCase().includes(term);

      if (matchName || matchClient || matchDescription || matchLocation || matchProjectNumber) {
        const subtitleParts = [`Cliente: ${project.client}`];
        if (project.value) {
          subtitleParts.push(`R$ ${project.value.toFixed(2)}`);
        }
        if (project.location) {
          subtitleParts.push(project.location);
        }
        
        results.push({
          id: project.id,
          type: 'project',
          title: project.name,
          subtitle: subtitleParts.join(' • '),
          data: project
        });
      }
    });

    // Buscar em Estoque
    stockItems.forEach(item => {
      const matchName = item.name?.toLowerCase().includes(term);
      const matchNotes = item.notes?.toLowerCase().includes(term);

      if (matchName || matchNotes) {
        results.push({
          id: item.id,
          type: 'stock',
          title: item.name,
          subtitle: `Quantidade: ${item.quantity} ${item.unit}`,
          data: item
        });
      }
    });

    // Buscar em Funcionários (evitar duplicatas - mostrar apenas uma vez)
    const uniqueEmployees = new Map<string, { name: string; dailyRate: number }>();
    
    Object.values(employees).forEach(employeeList => {
      employeeList.forEach(employee => {
        const employeeName = employee.name || employee.employeeName || 'Sem nome';
        const matchName = employeeName.toLowerCase().includes(term);

        if (matchName) {
          // Usar o nome como chave única para garantir uma única aparição
          if (!uniqueEmployees.has(employeeName)) {
            uniqueEmployees.set(employeeName, {
              name: employeeName,
              dailyRate: employee.dailyRate
            });
          }
        }
      });
    });

    // Adicionar funcionários únicos aos resultados
    uniqueEmployees.forEach((empData, name) => {
      results.push({
        id: name, // Usar o nome como ID único
        type: 'employee',
        title: empData.name,
        subtitle: `Taxa diária: R$ ${empData.dailyRate?.toFixed(2)}`,
        data: { name: empData.name, dailyRate: empData.dailyRate }
      });
    });

    return results;
  }, [searchTerm, expenses, projects, stockItems, employees]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const closeSearch = () => {
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleResultClick = (result: SearchResult) => {
    onSearchResultClick?.(result);
    closeSearch();
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'expense':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'project':
        return <Briefcase className="w-5 h-5 text-blue-600" />;
      case 'stock':
        return <Package className="w-5 h-5 text-orange-600" />;
      case 'employee':
        return <Users className="w-5 h-5 text-purple-600" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'expense':
        return 'Despesa';
      case 'project':
        return 'Projeto';
      case 'stock':
        return 'Estoque';
      case 'employee':
        return 'Funcionário';
    }
  };

  return (
    <div className="relative">
      {/* Botão da Lupa */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-white/10 transition-colors"
        title="Buscar"
      >
        <Search className="w-6 h-6 text-white" strokeWidth={2.8} />
      </button>

      {/* Overlay para fechar ao clicar fora */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeSearch}
        />
      )}

      {/* Caixa de Busca Deslizante */}
      <div
        className={`absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 overflow-hidden transition-all duration-300 ease-out origin-top ${
          isOpen 
            ? 'opacity-100 translate-y-0 scale-100 visible' 
            : 'opacity-0 -translate-y-4 scale-95 invisible'
        }`}
      >
        {/* Campo de Busca */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Resultados da Busca */}
        <div className="max-h-96 overflow-y-auto">
          {!searchTerm ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Digite para buscar</p>
              <p className="text-xs mt-1 text-gray-400">
                Despesas, projetos, estoque e funcionários
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum resultado encontrado</p>
              <p className="text-xs mt-1 text-gray-400">
                Tente buscar com outros termos
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {getTypeLabel(result.type)}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-gray-600 text-xs mt-0.5 truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

