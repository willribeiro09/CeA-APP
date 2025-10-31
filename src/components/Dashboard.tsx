import React, { useMemo, useState, useEffect } from 'react';
import { Expense, Project, StockItem, Employee } from '../types';
import { differenceInDays, format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/deviceUtils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, CheckCircle, Home, DollarSign, TrendingUp, Clock, Users, Package } from 'lucide-react';

interface DashboardProps {
  expenses: Record<string, Expense[]>;
  projects: Project[];
  stockItems: StockItem[];
  employees: Record<string, Employee[]>;
  onNavigate: (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export function Dashboard({ 
  expenses, 
  projects, 
  stockItems, 
  employees,
  onNavigate 
}: DashboardProps) {
  
  // Estado para notificações
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Estados para slideshow dos cards (somente Expenses mantém slideshow)
  const [expenseSlideIndex, setExpenseSlideIndex] = useState(0);

  // Carregar notificações
  const loadNotifications = async () => {
    const deviceId = getDeviceId();
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Subscrever a mudanças em tempo real
    const deviceId = getDeviceId();
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `device_id=eq.${deviceId}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Lista de despesas atrasadas para slideshow
  const overdueExpenses = useMemo(() => {
    const now = new Date();
    const overdue: Array<{description: string; amount: number; daysOverdue: number; projectName: string}> = [];
    
    Object.values(expenses).forEach(expenseList => {
      expenseList.forEach(expense => {
        if (!(expense.is_paid || expense.paid)) {
          const expenseDate = new Date(expense.date);
          if (expenseDate < now) {
            const daysOverdue = differenceInDays(now, expenseDate);
            overdue.push({
              description: expense.description || 'No description',
              amount: expense.amount || 0,
              daysOverdue,
              projectName: expense.project || 'General'
            });
          }
        }
      });
    });
    
    return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
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

  // Estatísticas de projetos apenas para clientes Private
  const privateProjectsStats = useMemo(() => {
    const privateProjects = projects.filter(p => p.clientType === 'Private');
    const pending = privateProjects.filter(p => p.status === 'pending').length;
    const inProgress = privateProjects.filter(p => p.status === 'in_progress').length;
    const completed = privateProjects.filter(p => p.status === 'completed').length;
    const total = privateProjects.length;

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
      <div className="fixed top-[120px] left-0 right-0 z-10 px-4">
        <div className="grid grid-cols-2 gap-3">
        {/* Card Projects - SLIDESHOW */}
        <div 
          onClick={() => onNavigate('Projects')}
          className="relative bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 rounded-xl p-3 shadow-lg border border-gray-200 cursor-pointer active:scale-95 transition-transform overflow-hidden h-[140px]"
        >
          {/* Ícone de fundo sutil */}
          <div className="absolute -right-3 -bottom-3 opacity-5">
            <Home className="w-24 h-24 text-blue-600" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col">
            {/* Header fixo - ícone e título lado a lado */}
            <div className="flex items-center gap-2 mb-2">
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
                <div className="w-full flex items-center justify-between">
                  {/* Donut */}
                  <div className="flex items-center justify-center">
                    <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
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
                  <div className="flex-1 ml-3 grid grid-cols-1 gap-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#F59E0B' }} />
                        <span className="text-gray-700 truncate">Pending</span>
                      </div>
                      <span className="text-gray-900 font-semibold ml-2 flex-shrink-0">{privateProjectsStats.pending}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#2563EB' }} />
                        <span className="text-gray-700 truncate">In Progress</span>
                      </div>
                      <span className="text-gray-900 font-semibold ml-2 flex-shrink-0">{privateProjectsStats.inProgress}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#16A34A' }} />
                        <span className="text-gray-700 truncate">Completed</span>
                      </div>
                      <span className="text-gray-900 font-semibold ml-2 flex-shrink-0">{privateProjectsStats.completed}</span>
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
          className="relative bg-gradient-to-br from-red-50 via-red-50 to-red-100 rounded-xl p-3 shadow-lg border border-gray-200 cursor-pointer active:scale-95 transition-transform overflow-hidden h-[140px]"
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
                        <div className="text-[10px] text-red-500 font-semibold mt-0.5">
                          {expense.daysOverdue} days overdue
                        </div>
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
          className="relative bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 rounded-xl p-3 shadow-lg border border-gray-200 cursor-pointer active:scale-95 transition-transform overflow-hidden h-[140px]"
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

        {/* Card Stock */}
        <div 
          onClick={() => onNavigate('Stock')}
          className={`relative rounded-xl p-3 shadow-lg border border-gray-200 cursor-pointer active:scale-95 transition-transform overflow-hidden h-[140px] ${
            lowStockCount > 0 
              ? 'bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100' 
              : 'bg-gradient-to-br from-green-50 via-green-50 to-green-100'
          }`}
        >
          {/* Ícone de fundo sutil */}
          <div className={`absolute -right-3 -bottom-3 opacity-5 ${
            lowStockCount > 0 ? 'text-orange-600' : 'text-green-600'
          }`}>
            <Package className="w-24 h-24" />
          </div>
          
          <div className="relative z-10">
            {/* Ícone e título lado a lado */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${
                lowStockCount > 0 
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600' 
                  : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {lowStockCount > 0 ? 'Low Stock items' : 'Stock OK'}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {lowStockCount}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Recent - Feed de Histórico */}
      <div className="fixed top-[446px] left-0 right-0 bottom-0 z-10 px-4">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-t-3xl rounded-b-none shadow-2xl shadow-[0_-18px_32px_-12px_rgba(0,0,0,0.25)] border border-gray-200 h-full flex flex-col overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-6 bg-[#5ABB37] rounded-full"></div>
              Recent:
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {notifications.length > 0 ? (
              <div>
                {notifications
                  .filter(n => {
                    const title = n.title.toLowerCase();
                    return !title.includes('atualizar funcionários') && 
                           !title.includes('update employee') &&
                           !title.includes('hora de atualizar') &&
                           !title.includes('time to update');
                  })
                  .map((notification) => {
                    const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    });

                    // Extrair dados da notificação
                    const projectPhoto = notification.data?.photoUrl || null;
                    const projectName = notification.data?.projectName || '';
                    const value = notification.data?.value || '';
                    const dueDate = notification.data?.dueDate || '';
                    const daysOverdue = notification.data?.daysOverdue || '';

                    // Remover TODOS os emojis do título e corpo
                    const cleanTitle = notification.title.replace(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
                    const cleanBody = notification.body.replace(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();

                    // Determinar tipo e ícone baseado no conteúdo
                    const getEventIcon = () => {
                      const title = cleanTitle.toLowerCase();
                      const body = cleanBody.toLowerCase();
                      
                      if (title.includes('expense') || title.includes('despesa') || title.includes('venc') || title.includes('due') || title.includes('overdue')) {
                        return { icon: DollarSign, color: 'text-red-600', bg: 'from-red-50 to-red-100' };
                      } else if (title.includes('project') || title.includes('projeto')) {
                        return { icon: Home, color: 'text-blue-600', bg: 'from-blue-50 to-blue-100' };
                      } else if (title.includes('employee') || title.includes('funcionário') || title.includes('work')) {
                        return { icon: Users, color: 'text-purple-600', bg: 'from-purple-50 to-purple-100' };
                      } else if (title.includes('stock') || title.includes('estoque')) {
                        return { icon: Package, color: 'text-orange-600', bg: 'from-orange-50 to-orange-100' };
                      } else if (title.includes('complet') || title.includes('concluí')) {
                        return { icon: CheckCircle, color: 'text-green-600', bg: 'from-green-50 to-green-100' };
                      } else {
                        return { icon: TrendingUp, color: 'text-gray-600', bg: 'from-gray-50 to-gray-100' };
                      }
                    };

                    const { icon: EventIcon, color, bg } = getEventIcon();

                    return (
                      <div 
                        key={notification.id}
                        className="relative px-4 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-100"
                      >
                        <div className="flex gap-3">
                          {/* Miniatura ou ícone indicador à esquerda */}
                          <div className="flex-shrink-0">
                            {projectPhoto ? (
                              <img 
                                src={projectPhoto} 
                                alt="" 
                                className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${bg} flex items-center justify-center`}>
                                <EventIcon className={`w-6 h-6 ${color}`} />
                              </div>
                            )}
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            {/* Título */}
                            <h4 className="text-sm font-semibold text-gray-900 leading-tight mb-1">
                              {cleanTitle}
                            </h4>

                            {/* Descrição */}
                            <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2">
                              {cleanBody}
                            </p>

                            {/* Detalhes adicionais */}
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              {projectName && (
                                <span className="inline-flex items-center gap-1 text-gray-500">
                                  <Home className="w-3 h-3" />
                                  {projectName}
                                </span>
                              )}
                              {value && (
                                <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                  <DollarSign className="w-3 h-3" />
                                  {value}
                                </span>
                              )}
                              {dueDate && (
                                <span className="inline-flex items-center gap-1 text-orange-600">
                                  <Clock className="w-3 h-3" />
                                  {dueDate}
                                </span>
                              )}
                              {daysOverdue && (
                                <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                  <AlertCircle className="w-3 h-3" />
                                  {daysOverdue} dias atrasado
                                </span>
                              )}
                              <span className="text-gray-400 ml-auto">{timeAgo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
