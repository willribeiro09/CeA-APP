import React, { useMemo, useState, useEffect } from 'react';
import { Expense, Project, StockItem, Employee } from '../types';
import { differenceInDays, format, addMonths, addDays, addWeeks } from 'date-fns';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/deviceUtils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, CheckCircle, Home, DollarSign, TrendingUp, Clock, Users, Calendar, StickyNote, FileText, Boxes, MapPin } from 'lucide-react';
import { isRecurringExpense, getRecurrenceType } from '../lib/recurringUtils';
import { buildCardExpensesFromCA } from '../lib/expenseCardUtils';

interface DashboardProps {
  expenses: Record<string, Expense[]>;
  projects: Project[];
  stockItems: StockItem[];
  employees: Record<string, Employee[]>;
  onNavigate: (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
  onItemClick: (item: any, type: 'expense' | 'project' | 'stock' | 'employee') => void;
}

// Interface de Notificação comentada - não usado mais
// interface Notification {
//   id: string;
//   title: string;
//   body: string;
//   data: any;
//   is_read: boolean;
//   created_at: string;
// }

export function Dashboard({ 
  expenses, 
  projects, 
  stockItems, 
  employees,
  onNavigate,
  onItemClick
}: DashboardProps) {
  
  // NOTIFICAÇÕES DESABILITADAS - Não aparecem mais na lista Recent (apenas ações reais dos usuários)
  // const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Estados para slideshow dos cards (somente Expenses mantém slideshow)
  const [expenseSlideIndex, setExpenseSlideIndex] = useState(0);

  const [recentTab, setRecentTab] = useState<'Recent' | 'Board' | 'Receipts' | 'Stock'>('Recent');

  // CÓDIGO DE NOTIFICAÇÕES COMENTADO - Manter caso precise no futuro
  // const loadNotifications = async () => {
  //   const deviceId = getDeviceId();
  //   
  //   const { data, error } = await supabase
  //     .from('notifications')
  //     .select('*')
  //     .eq('device_id', deviceId)
  //     .order('created_at', { ascending: false })
  //     .limit(10);
  //
  //   if (!error && data) {
  //     setNotifications(data);
  //   }
  // };

  // useEffect(() => {
  //   loadNotifications();
  //
  //   // Subscrever a mudanças em tempo real
  //   const deviceId = getDeviceId();
  //   const channel = supabase
  //     .channel('notifications-channel')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'notifications',
  //         filter: `device_id=eq.${deviceId}`
  //       },
  //       () => {
  //         loadNotifications();
  //       }
  //     )
  //     .subscribe();
  //
  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, []);
  
  // Lista de despesas C&A: mostrar todas (nome, valor e data de vencimento)
  const overdueExpenses = useMemo(() => {
    const listCA = (expenses['C&A'] || []) as Expense[];
    return listCA.map(e => ({
      description: e.description || 'No description',
      amount: e.amount || 0,
      date: e.date || '',
    }));
  }, [expenses]);

  // Estatísticas de expenses (TODAS, sem filtro de data)
  const expensesStats = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    let paid = 0;
    let dueSoon = 0;
    let unpaid = 0;
    let total = 0;
    let unpaidAmount = 0; // Valor total não pago
    let overdue = 0; // Contagem de atrasadas
    
    Object.values(expenses).forEach(expenseList => {
      expenseList.forEach(expense => {
        total++;
        
        if (expense.is_paid || expense.paid) {
          paid++;
        } else {
          // Não paga - somar valor
          unpaidAmount += expense.amount || 0;
          
          const expenseDate = new Date(expense.date);
          if (expenseDate < now) {
            // Atrasada
            unpaid++;
            overdue++;
          } else if (expenseDate <= sevenDaysFromNow) {
            // Prestes a vencer (próximos 7 dias)
            dueSoon++;
          } else {
            // Futura (não paga mas longe ainda)
            unpaid++;
          }
        }
      });
    });
    
    return {
      paid,
      dueSoon,
      unpaid,
      total,
      unpaidAmount,
      overdue
    };
  }, [expenses]);

  // Estatísticas de projetos Private:
  // - completed: apenas do mês atual
  // - pending e in_progress: considerar todos (independente de mês)
  const privateProjectsStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const normalize = (d?: string | number | Date) => (d ? new Date(d) : undefined);

    const inCurrentMonthRange = (start?: Date, end?: Date) => {
      // Se tiver só start, considera o start; se tiver start e end, considera qualquer interseção no mês
      if (start && !end) {
        return start >= monthStart && start <= monthEnd;
      }
      if (start && end) {
        // Interseção de intervalos [start, end] x [monthStart, monthEnd]
        return start <= monthEnd && end >= monthStart;
      }
      return false;
    };

    const privateProjects = projects.filter(p => p.clientType === 'Private');

    // Completed do mês atual (intersecção de intervalo com mês)
    const filteredForCompleted = privateProjects.filter(p => {
      const start = normalize(p.startDate as any);
      // usar endDate quando existir; caso contrário, lastModified como aproximação
      const end = normalize((p as any).endDate) || normalize(p.lastModified as any);
      return inCurrentMonthRange(start, end || start);
    });

    const pending = privateProjects.filter(p => p.status === 'pending').length;
    const inProgress = privateProjects.filter(p => p.status === 'in_progress').length;
    const completed = filteredForCompleted.filter(p => p.status === 'completed').length;
    const total = pending + inProgress + completed;

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return {
      pending,
      inProgress,
      completed,
      total,
      pendingPct: pct(pending),
      inProgressPct: pct(inProgress),
      completedPct: pct(completed)
    };
  }, [projects]);

  // Dados para gráfico de pizza (donut) dos projetos Private
  const privateProjectsDonut = useMemo(() => {
    const total = privateProjectsStats.total || 0;
    const segments = [
      { label: 'Pending', value: privateProjectsStats.pending, color: '#F59E0B' },
      { label: 'In Progress', value: privateProjectsStats.inProgress, color: '#2563EB' },
      { label: 'Completed', value: privateProjectsStats.completed, color: '#16A34A' }
    ];
    return { total, segments };
  }, [privateProjectsStats]);

  // Estatísticas de projetos
  const projectsStats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const inProgress = projects.filter(p => p.status === 'in_progress').length;
    const pending = projects.filter(p => p.status === 'pending').length;
    
    // Completos deste mês
    const completed = projects.filter(p => {
      if (p.status === 'completed' && p.lastModified) {
        const completedDate = new Date(p.lastModified);
        return completedDate.getMonth() === currentMonth && 
               completedDate.getFullYear() === currentYear;
      }
      return false;
    }).length;
    
    const total = inProgress + pending + completed;
    
    return {
      inProgress,
      pending,
      completed,
      total
    };
  }, [projects]);

  // Funcionários trabalhando hoje (nome + contagem)
  const employeesTodayData = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const workingNames: string[] = [];
    
    Object.values(employees).forEach(weekEmployees => {
      weekEmployees.forEach(employee => {
        if (employee.workedDates && employee.workedDates.includes(today)) {
          const name = (employee.employeeName || employee.name || '').trim();
          if (name && !workingNames.includes(name)) {
            workingNames.push(name);
          }
        }
      });
    });
    
    return { count: workingNames.length, names: workingNames };
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

  // Agregar atividades recentes reais (Projetos, Funcionários, Despesas, Notificações)
  const recentActivities = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'notification' | 'project' | 'employee' | 'expense' | 'stock';
      title: string;
      description: string;
      date: Date;
      icon: any;
      color: string;
      bg: string;
      amount?: number;
      photo?: string;
      location?: string;
      data?: any;
    }> = [];
    
    const now = new Date();

    // 1. Projetos Recentes (Últimos 7 dias)
    projects.forEach(p => {
      const date = p.lastModified ? new Date(p.lastModified) : new Date(p.startDate);
      if (differenceInDays(now, date) <= 7) {
        // Definir título baseado no status
        let title = 'Project Updated';
        if (p.status === 'completed') {
          title = 'Project Completed';
        } else if (p.status === 'in_progress') {
          title = 'Project In Progress';
        } else if (p.status === 'pending') {
          title = 'New Project';
        }
        
        // Descrição: mostrar apenas o cliente (sem duplicar)
        const description = p.client || p.name;
        
        activities.push({
          id: `proj-${p.id}`,
          type: 'project',
          title: title,
          description: description,
          date: date,
          icon: Home,
          color: 'text-blue-600',
          bg: 'from-blue-50 to-blue-100',
          photo: p.photos && p.photos.length > 0 ? p.photos[0].url : undefined,
          location: p.location,
          amount: p.value,
          data: p
        });
      }
    });

    // 2. Funcionários (Trabalharam recentemente - Últimos 5 dias)
    Object.values(employees).forEach(list => {
      list.forEach(e => {
        if (e.workedDates) {
          e.workedDates.forEach(d => {
            const workDate = new Date(d + 'T12:00:00');
            if (differenceInDays(now, workDate) <= 5) {
               activities.push({
                id: `emp-${e.id}-${d}`,
                type: 'employee',
                title: 'Employee Worked',
                description: `${e.employeeName || e.name}`,
                date: workDate,
                icon: Users,
                color: 'text-purple-600',
                bg: 'from-purple-50 to-purple-100',
                data: e
              });
            }
          });
        }
      });
    });

    // 3. Despesas Recentes (Últimos 7 dias)
    Object.values(expenses).forEach(list => {
      list.forEach(ex => {
         const date = ex.lastModified ? new Date(ex.lastModified) : new Date(ex.date);
         // Mostrar despesas modificadas ou criadas nos últimos 7 dias
         if (differenceInDays(now, date) <= 7) {
           // Verificar se está paga: checar is_paid OU se tem parcelas pagas
           const isPaid = ex.is_paid || 
                         ex.paid || 
                         (ex.installments && ex.installments.length > 0 && 
                          ex.installments.some(inst => inst.isPaid));
           
           // Se está paga, mostrar como "Expense Paid" em verde
           // Se não está paga, mostrar como "New Expense" em vermelho
           activities.push({
             id: `exp-${ex.id}`,
             type: 'expense',
             title: isPaid ? 'Expense Paid' : 'New Expense',
             description: ex.description,
             date: date,
             icon: isPaid ? CheckCircle : DollarSign,
             color: isPaid ? 'text-green-600' : 'text-red-600',
             bg: isPaid ? 'from-green-50 to-green-100' : 'from-red-50 to-red-100',
             amount: ex.amount,
             data: ex
           });
         }
      });
    });

    // Remover duplicatas exatas de ID e ordenar
    const unique = Array.from(new Map(activities.map(item => [item.id, item])).values());
    return unique.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50);
  }, [projects, employees, expenses]);

  // (Projetos não possuem mais slideshow no card)

  // Slideshow automático para despesas atrasadas
  useEffect(() => {
    if (overdueExpenses.length === 0) return;
    
    const interval = setInterval(() => {
      setExpenseSlideIndex((prev) => (prev + 1) % overdueExpenses.length);
    }, 4000); // Muda a cada 4 segundos
    
    return () => clearInterval(interval);
  }, [overdueExpenses.length]);

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Fundo azul global movido para App.tsx */}
      
      {/* Cards fixos */}
      <div className="fixed top-[110px] left-0 right-0 z-10 px-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {/* Card Projects - SLIDESHOW */}
        <div 
          onClick={() => onNavigate('Projects')}
          className="relative bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 rounded-xl p-3 shadow-lg border border-gray-200 cursor-pointer active:scale-95 transition-transform overflow-hidden h-[125px]"
        >
          {/* Ícone de fundo sutil */}
          <div className="absolute -right-3 -bottom-3 opacity-5">
            <Home className="w-24 h-24 text-blue-600" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col">
            {/* Header fixo - ícone e título lado a lado */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow flex-shrink-0">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <div className="text-xs text-gray-800 font-semibold tracking-wide">Projects</div>
                </div>
              </div>
            </div>
            
            {/* Área informativa: gráfico pizza (Private only) */}
            <div className="flex-1 flex items-center">
              {privateProjectsDonut.total > 0 ? (
                <div className="w-full flex items-center">
                  {/* Donut */}
                  <div className="flex items-center justify-center mr-2">
                    <svg width="60" height="60" viewBox="0 0 72 72" className="-rotate-90">
                      {(() => {
                        const radius = 28;
                        const cx = 36;
                        const cy = 36;
                        const circumference = 2 * Math.PI * radius;
                        let offset = 0;
                        return privateProjectsDonut.segments
                          .filter(s => s.value > 0)
                          .map((seg, idx) => {
                            const length = (seg.value / privateProjectsDonut.total) * circumference;
                            const el = (
                              <circle
                                key={idx}
                                cx={cx}
                                cy={cy}
                                r={radius}
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth={8}
                                strokeDasharray={`${length} ${circumference - length}`}
                                strokeDashoffset={-offset}
                                strokeLinecap="butt"
                              />
                            );
                            offset += length;
                            return el;
                          });
                      })()}
                      <circle cx="36" cy="36" r="22" fill="white" />
                    </svg>
                  </div>

                  {/* Legenda compacta */}
                  <div className="flex-1 ml-1 grid grid-cols-1 gap-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#F59E0B' }} />
                        <span className="text-gray-700 truncate text-[10px]">Pending</span>
                      </div>
                      <span className="text-gray-900 font-semibold ml-1 flex-shrink-0">{privateProjectsStats.pending}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#2563EB' }} />
                        <span className="text-gray-700 truncate text-[10px]">In Progress</span>
                      </div>
                      <span className="text-gray-900 font-semibold ml-1 flex-shrink-0">{privateProjectsStats.inProgress}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#16A34A' }} />
                        <span className="text-gray-700 truncate text-[10px]">Completed</span>
                      </div>
                      <span className="text-gray-900 font-semibold ml-1 flex-shrink-0">{privateProjectsStats.completed}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center w-full">
                  <div className="text-sm text-gray-600">No Private projects</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Expenses - SLIDESHOW */}
        <div 
          onClick={() => onNavigate('Expenses')}
          className="relative bg-gradient-to-br from-red-50 via-red-50 to-red-100 rounded-xl p-3 shadow-lg border border-gray-200 cursor-pointer active:scale-95 transition-transform overflow-hidden h-[125px]"
        >
          {/* Ícone de fundo sutil */}
          <div className="absolute -right-3 -bottom-3 opacity-5">
            <DollarSign className="w-24 h-24 text-red-600" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col">
            {/* Header fixo - ícone e título lado a lado */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow flex-shrink-0">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 flex items-center justify-between min-w-0">
                <div className="text-xs text-gray-700 font-semibold">To Pay</div>
              </div>
            </div>
            
            {/* Slideshow area - ajustado para melhor distribuição */}
            <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
              {overdueExpenses.length > 0 ? (
                <div className="w-full h-full relative">
                  {overdueExpenses.map((expense, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 flex flex-col justify-center transition-all duration-700 ease-in-out ${
                        index === expenseSlideIndex 
                          ? 'opacity-100 translate-y-0' 
                          : index < expenseSlideIndex 
                          ? 'opacity-0 translate-y-full'
                          : 'opacity-0 -translate-y-full'
                      }`}
                    >
                      <div className="text-center px-2">
                        <div className="text-sm font-semibold text-gray-900 truncate max-w-[95%] mx-auto">
                          {expense.description}
                        </div>
                        <div className="text-lg font-extrabold text-red-600 mt-0.5">
                          ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        {expense.date && (
                          <div className="text-[10px] text-gray-600 mt-1">
                            Due: {format(new Date(expense.date), 'MMM d', { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-0.5">
                    ✓ All Paid
                  </div>
                  <div className="text-[10px] text-gray-600">No overdue</div>
                  {expensesStats.dueSoon > 0 && (
                    <div className="text-[9px] text-orange-500 mt-0.5">
                      ⚠️ {expensesStats.dueSoon} due soon
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Employees */}
        <div 
          onClick={() => onNavigate('Employees')}
          className="relative bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 rounded-xl p-3 shadow-lg border border-gray-200 cursor-pointer active:scale-95 transition-transform overflow-hidden h-[125px]"
        >
          {/* Ícone de fundo sutil */}
          <div className="absolute -right-3 -bottom-3 opacity-5">
            <Users className="w-24 h-24 text-purple-600" />
          </div>

          <div className="relative z-10 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow flex-shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs text-gray-800 font-semibold tracking-wide">Employees</div>
            </div>

            {/* Conteúdo: Nomes ou alerta */}
            <div className="flex-1 flex items-center justify-center">
              {employeesTodayData.count === 0 ? (
                <div className="text-center animate-pulse-slow">
                  <div className="text-sm font-semibold text-gray-700">No one today</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Click to update</div>
                </div>
              ) : (
                <div className="w-full">
                  <div className="text-[10px] text-gray-600 mb-1">Working today:</div>
                  <div className="flex flex-wrap gap-1">
                    {employeesTodayData.names.map((name, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-white/80 border border-purple-200 text-gray-800">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Planner */}
        <div 
          onClick={() => onNavigate('Stock')}
          className="relative rounded-xl p-3 shadow-lg border border-gray-200 cursor-pointer active:scale-95 transition-transform overflow-hidden h-[125px] bg-gradient-to-br from-green-50 via-green-50 to-green-100"
        >
          <div className="absolute -right-3 -bottom-3 opacity-5 text-green-500">
            <Calendar className="w-28 h-28" />
          </div>
          <div className="absolute top-1 right-3 text-[40px] text-gray-900" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400 }}>
            {format(new Date(), 'd')}
          </div>
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow bg-gradient-to-br from-green-500 to-green-600 flex-shrink-0">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xs text-gray-800 font-semibold tracking-wide">Planner</div>
                <div className="text-sm text-gray-900 font-bold">{format(new Date(), 'MMMM')}</div>
              </div>
            </div>
            <div className="flex-1 flex items-center">
              <div className="rounded-lg p-2 w-full text-center border border-white/40 bg-white/20 backdrop-blur-[1px]">
                <div className="text-[10px] uppercase text-gray-600 font-semibold tracking-wider">Upcoming</div>
                <div className="text-xs text-gray-600 mt-1">No events</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Recent - Feed de Histórico */}
      <div className="fixed top-[380px] left-0 right-0 bottom-0 z-[5] px-4">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-t-3xl rounded-b-none shadow-xl shadow-[0_-12px_24px_-10px_rgba(0,0,0,0.18)] border border-gray-200 h-full flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <div className="flex items-center justify-center gap-2">
              {[
                { key: 'Recent', Icon: TrendingUp },
                { key: 'Board', Icon: StickyNote },
                { key: 'Receipts', Icon: FileText },
                { key: 'Stock', Icon: Boxes },
              ].map(({ key: tab, Icon }) => (
                <button
                  key={tab}
                  onClick={() => setRecentTab(tab as 'Recent' | 'Board' | 'Receipts' | 'Stock')}
                  className={`relative px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
                    recentTab === tab
                      ? 'text-[#073863]'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab}
                  {recentTab === tab && (
                    <span className="absolute inset-x-0 -bottom-2 h-[3px] bg-[#073863] rounded-full"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {recentTab === 'Recent' && recentActivities.length > 0 ? (
              <div>
                {recentActivities.map((activity) => {
                  const timeAgo = formatDistanceToNow(activity.date, {
                    addSuffix: true,
                    locale: ptBR
                  });
                  const EventIcon = activity.icon;

                  return (
                    <div 
                      key={activity.id}
                      onClick={() => {
                        if (activity.data && (activity.type === 'expense' || activity.type === 'project')) {
                          onItemClick(activity.data, activity.type);
                        }
                      }}
                      className="relative px-3 py-2 hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-100 flex items-center gap-3"
                    >
                      {/* Ícone menor ou Foto */}
                      <div className="flex-shrink-0">
                        {activity.photo ? (
                          <img 
                            src={activity.photo} 
                            alt="" 
                            className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activity.bg} flex items-center justify-center`}>
                            <EventIcon className={`w-4 h-4 ${activity.color}`} />
                          </div>
                        )}
                      </div>

                      {/* Conteúdo compacto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-xs font-semibold text-gray-900 leading-none truncate mr-2">
                            {activity.title}
                          </h4>
                          {activity.amount !== undefined ? (
                             <span className={`text-[11px] font-bold whitespace-nowrap flex-shrink-0 ${activity.type === 'expense' && !activity.title.includes('Paid') ? 'text-red-600' : 'text-green-600'}`}>
                               ${activity.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                             </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo}</span>
                          )}
                        </div>
                        <div className="flex flex-col mt-0.5">
                          <p className="text-[11px] text-gray-600 leading-tight truncate pr-2">
                            {activity.description}
                          </p>
                          {activity.location && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{activity.location}</span>
                            </div>
                          )}
                        </div>
                        {activity.amount !== undefined && (
                          <div className="flex justify-end mt-0.5">
                            <span className="text-[9px] text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : recentTab === 'Recent' ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                  <TrendingUp className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-xs">No recent activity</p>
              </div>
            ) : recentTab === 'Stock' ? (
              // Lista de itens do inventário
              stockItems.length > 0 ? (
                <div>
                  {stockItems.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => onItemClick(item, 'stock')}
                      className="relative px-3 py-2 hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-100 flex items-center gap-3"
                    >
                      <div className="flex-shrink-0">
                        {item.photo ? (
                          <img 
                            src={item.photo} 
                            alt="" 
                            className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                            <Boxes className="w-4 h-4 text-purple-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-xs font-semibold text-gray-900 leading-none truncate mr-2">
                            {item.name}
                          </h4>
                          <span className="text-[11px] font-bold whitespace-nowrap flex-shrink-0 text-gray-600">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-tight truncate mt-0.5">
                          {item.category}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                    <Boxes className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-xs">No items in inventory</p>
                </div>
              )
            ) : (
              // Placeholder para Board e Receipts
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <p className="text-xs">Content coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

