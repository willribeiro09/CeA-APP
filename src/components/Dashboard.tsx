import React, { useMemo } from 'react';
import { Expense, Project, StockItem, Employee } from '../types';
import { differenceInDays, format } from 'date-fns';

interface DashboardProps {
  expenses: Record<string, Expense[]>;
  projects: Project[];
  stockItems: StockItem[];
  employees: Record<string, Employee[]>;
  onNavigate: (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
}

interface ActivityItem {
  id: string;
  type: 'project' | 'expense' | 'employee' | 'stock';
  description: string;
  time: string;
  photo?: string;
}

export function Dashboard({ 
  expenses, 
  projects, 
  stockItems, 
  employees,
  onNavigate 
}: DashboardProps) {
  
  // Calcular total de expenses do mês
  const monthlyExpensesTotal = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let total = 0;
    
    Object.values(expenses).forEach(expenseList => {
      expenseList.forEach(expense => {
        const expenseDate = new Date(expense.date);
        if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
          total += expense.amount || 0;
        }
      });
    });
    
    return total;
  }, [expenses]);

  // Contar projetos ativos
  const activeProjectsCount = useMemo(() => {
    return projects.filter(p => p.status === 'in_progress').length;
  }, [projects]);

  // Contar funcionários trabalhando hoje
  const employeesWorkingToday = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    let count = 0;
    
    Object.values(employees).forEach(weekEmployees => {
      weekEmployees.forEach(employee => {
        if (employee.workedDates && employee.workedDates.includes(today)) {
          count++;
        }
      });
    });
    
    return count;
  }, [employees]);

  // Contar itens de estoque baixos
  const lowStockCount = useMemo(() => {
    return stockItems.filter(item => {
      if (item.minimumQuantity) {
        return item.quantity < item.minimumQuantity;
      }
      return item.quantity <= 0;
    }).length;
  }, [stockItems]);

  // Gerar atividades recentes
  const recentActivities = useMemo(() => {
    const activities: ActivityItem[] = [];
    const now = new Date();
    
    // Adicionar projetos novos (últimos 2 dias)
    projects
      .filter(p => p.lastModified && differenceInDays(now, new Date(p.lastModified)) <= 2)
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
      .slice(0, 3)
      .forEach(project => {
        const hoursAgo = Math.floor((now.getTime() - (project.lastModified || 0)) / (1000 * 60 * 60));
        activities.push({
          id: project.id,
          type: 'project',
          description: `New project: ${project.name}`,
          time: hoursAgo < 1 ? 'Just now' : hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`,
          photo: project.photos && project.photos.length > 0 ? project.photos[0].url : undefined
        });
      });

    // Adicionar despesas recentes vencendo (próximos 3 dias)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    Object.values(expenses).forEach(expenseList => {
      expenseList
        .filter(expense => {
          if (expense.is_paid || expense.paid) return false;
          const dueDate = new Date(expense.date);
          return dueDate >= now && dueDate <= threeDaysFromNow;
        })
        .slice(0, 2)
        .forEach(expense => {
          const dueDate = new Date(expense.date);
          const daysUntil = differenceInDays(dueDate, now);
          activities.push({
            id: expense.id,
            type: 'expense',
            description: `${expense.description} due ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}`,
            time: format(dueDate, 'MMM dd'),
            photo: expense.receipts && expense.receipts.length > 0 ? expense.receipts[0].url : undefined
          });
        });
    });

    return activities.slice(0, 5);
  }, [projects, expenses]);

  return (
    <div className="relative min-h-screen">
      {/* Fundo azul que desce do header */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#2c5f8d] to-[#3a7ab5] -mt-[100px] pt-[100px]"></div>
      
      {/* Conteúdo */}
      <div className="relative z-10 pb-24 px-4 pt-12">
        {/* Grid de Cards 2x2 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Card Expenses */}
        <div 
          onClick={() => onNavigate('Expenses')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="text-sm text-gray-600 mb-2">Expenses</div>
          <div className="text-sm text-gray-600 mb-1">this month</div>
          <div className="text-2xl font-bold text-[#5ABB37]">
            ${monthlyExpensesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card Projects */}
        <div 
          onClick={() => onNavigate('Projects')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="text-sm text-gray-600 mb-2">Active projects</div>
          <div className="text-4xl font-bold text-[#5ABB37] mt-4">
            {activeProjectsCount}
          </div>
        </div>

        {/* Card Employees */}
        <div 
          onClick={() => onNavigate('Employees')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="text-sm text-gray-600 mb-2">Employees</div>
          <div className="text-sm text-gray-600 mb-1">working today</div>
          <div className="text-4xl font-bold text-[#5ABB37] mt-1">
            {employeesWorkingToday}
          </div>
        </div>

        {/* Card Stock */}
        <div 
          onClick={() => onNavigate('Stock')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="text-sm text-gray-600 mb-2">Low stock items</div>
          <div className={`text-4xl font-bold mt-4 ${lowStockCount > 0 ? 'text-red-500' : 'text-[#5ABB37]'}`}>
            {lowStockCount}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Recent Activity</h3>
        
        {recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activity.time}
                  </p>
                </div>
                {activity.photo && (
                  <div className="ml-3 flex-shrink-0">
                    <img 
                      src={activity.photo} 
                      alt="" 
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No recent activity
          </p>
        )}
      </div>
      </div>
    </div>
  );
}

