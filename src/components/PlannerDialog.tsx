import React, { useState, useMemo, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, DollarSign, CheckCircle, Clock, Plus, Home, AlertCircle } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  getDay,
  parseISO,
  setHours,
  setMinutes
} from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { Project, Expense } from '../types';

interface PlannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  expenses: Record<string, Expense[]>;
  onProjectClick?: (project: Project) => void;
  onExpenseClick?: (expense: Expense) => void;
}

type EventType = 'project' | 'expense' | 'custom';

interface CalendarEvent {
  id: string;
  date: Date;
  type: EventType;
  title: string;
  description?: string;
  amount?: number;
  isPaid?: boolean;
  status?: string;
  time?: string;
  data: any;
}

export function PlannerDialog({ isOpen, onClose, projects, expenses, onProjectClick, onExpenseClick }: PlannerDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  
  // Estado temporário para eventos customizados (apenas em memória nesta sessão)
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
  
  // Estado para formulário de novo evento
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('09:00');

  // Estados para swipe/arrastar
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Função auxiliar para normalizar datas (evitar problemas de timezone)
  const normalizeDate = (dateString: string): Date => {
    // Se a string já inclui timezone, usar parseISO
    if (dateString.includes('T') || dateString.includes('Z') || dateString.includes('+')) {
      return parseISO(dateString);
    }
    // Se for apenas data (YYYY-MM-DD), criar como data local (não UTC)
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Unificar todos os eventos
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [...customEvents];

    // Projetos
    projects.forEach(project => {
      if (project.startDate) {
        allEvents.push({
          id: `proj-${project.id}`,
          date: normalizeDate(project.startDate),
          type: 'project',
          title: project.client || project.name,
          description: project.name,
          status: project.status,
          time: 'Start',
          data: project
        });
      }
    });

    return allEvents.sort((a, b) => {
      // Ordenar por tipo (Custom > Project > Expense) ou horário se disponível
      return 0;
    });
  }, [projects, expenses, customEvents]);

  // Eventos do dia selecionado
  const selectedDayEvents = useMemo(() => {
    return events.filter(event => isSameDay(event.date, selectedDate));
  }, [events, selectedDate]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDayOfWeek = getDay(start);
    const paddingDays = Array(startDayOfWeek).fill(null);
    return [...paddingDays, ...days];
  }, [currentMonth]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  // Handlers para swipe/arrastar - versão mais fluida
  const handleDragStart = (clientX: number) => {
    setDragStart(clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleDragMove = (clientX: number) => {
    if (dragStart === null) return;
    const offset = clientX - dragStart;
    // Limitar o offset para dar feedback visual sem exagerar
    const maxOffset = 100;
    const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, offset));
    setDragOffset(limitedOffset);
  };

  const handleDragEnd = () => {
    if (dragStart === null) return;
    
    const threshold = 30; // Threshold reduzido para ser mais responsivo
    const velocity = Math.abs(dragOffset) / 10; // Considerar velocidade do movimento
    const effectiveThreshold = threshold - velocity; // Threshold dinâmico baseado na velocidade
    
    if (Math.abs(dragOffset) > Math.max(20, effectiveThreshold)) {
      if (dragOffset > 0) {
        // Arrastou para a direita -> mês anterior
        handlePrevMonth();
      } else {
        // Arrastou para a esquerda -> próximo mês
        handleNextMonth();
      }
    }
    
    // Reset com animação suave
    setDragStart(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  // Touch handlers - versão mais fluida
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart === null) return;
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const offset = currentX - dragStart;
    
    // Se o arrasto for principalmente horizontal, prevenir scroll
    // Threshold menor para detectar movimento horizontal mais cedo
    if (Math.abs(offset) > 5) {
      e.preventDefault();
    }
    
    handleDragMove(currentX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX);
  };

  // Adicionar listeners globais para mouse quando estiver arrastando
  useEffect(() => {
    if (!isDragging || dragStart === null) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const offset = e.clientX - dragStart;
      // Limitar o offset para dar feedback visual sem exagerar
      const maxOffset = 100;
      const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, offset));
      setDragOffset(limitedOffset);
    };

    const handleGlobalMouseUp = () => {
      const threshold = 30; // Threshold reduzido para ser mais responsivo
      const velocity = Math.abs(dragOffset) / 10; // Considerar velocidade do movimento
      const effectiveThreshold = threshold - velocity; // Threshold dinâmico baseado na velocidade
      
      if (Math.abs(dragOffset) > Math.max(20, effectiveThreshold)) {
        if (dragOffset > 0) {
          handlePrevMonth();
        } else {
          handleNextMonth();
        }
      }
      
      setDragStart(null);
      setIsDragging(false);
      setDragOffset(0);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, dragOffset]);

  const hasEvents = (date: Date) => {
    const dayEvents = events.filter(e => isSameDay(e.date, date));
    if (dayEvents.length === 0) return null;
    
    const hasProject = dayEvents.some(e => e.type === 'project');
    const hasCustom = dayEvents.some(e => e.type === 'custom');
    
    if (hasCustom) return 'bg-[#073863]';
    return 'bg-blue-500';
  };

  const handleAddEvent = () => {
    if (!newEventTitle) return;
    
    const [hours, minutes] = newEventTime.split(':').map(Number);
    const eventDate = setMinutes(setHours(selectedDate, hours), minutes);

    const newEvent: CalendarEvent = {
      id: `custom-${Date.now()}`,
      date: eventDate,
      type: 'custom',
      title: newEventTitle,
      time: newEventTime,
      data: null
    };

    setCustomEvents([...customEvents, newEvent]);
    setNewEventTitle('');
    setIsAddEventOpen(false);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'project' && onProjectClick) {
      onProjectClick(event.data);
    } else if (event.type === 'expense' && onExpenseClick) {
      onExpenseClick(event.data);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 transition-opacity" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-[420px] max-h-[90vh] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-contentShow focus:outline-none">
          
          {/* Header Gradient */}
          <div className="bg-gradient-to-b from-gray-50 to-white pb-4">
            {/* Month Navigation and Add Event Button */}
            <div className="px-6 pt-6 pb-2 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    {/* Botão de fechar no lugar do ano */}
                    <Dialog.Close asChild>
                      <button 
                        className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors active:scale-95 mb-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Dialog.Close>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-bold text-gray-900 capitalize tracking-tight">
                        {format(currentMonth, 'MMMM', { locale: enUS })}
                      </h2>
                      {/* Seletor discreto de meses */}
                      <div className="flex gap-0.5">
                        <button 
                          onClick={handlePrevMonth} 
                          className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={handleNextMonth} 
                          className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Ano abaixo do mês */}
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">
                      {format(currentMonth, 'yyyy')}
                    </span>
                  </div>
                </div>
                {/* Botão Add Event alinhado com o mês */}
                <button 
                  onClick={() => setIsAddEventOpen(true)}
                  className="px-4 py-2 bg-[#5abb36] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </button>
              </div>
            </div>

            {/* Week Days */}
            <div className="px-6 grid grid-cols-7">
              {weekDays.map((day, i) => (
                <div key={i} className="text-center text-[11px] font-bold text-gray-400 uppercase">
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Grid & Events */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* Calendar Grid - Aceita swipe horizontal */}
            <div 
              className="select-none mb-8"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              style={{
                transform: isDragging ? `translateX(${dragOffset}px)` : 'translateX(0)',
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'pan-y', // Permitir scroll vertical, mas capturar swipe horizontal
                willChange: 'transform', // Otimização para performance
                opacity: isDragging ? 0.95 : 1 // Feedback visual sutil durante o arrasto
              }}
            >
              <div className="grid grid-cols-7 gap-y-3">
              {calendarDays.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} />;
                
                const isSelected = isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);
                const notCurrentMonth = !isSameMonth(date, currentMonth);
                const eventIndicatorColor = hasEvents(date);

                return (
                  <div key={date.toISOString()} className="flex flex-col items-center relative">
                    <button
                      onClick={() => setSelectedDate(date)}
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-[15px] transition-all relative z-10
                        ${isSelected ? 'bg-[#073863] text-white shadow-md scale-100 font-semibold' : ''}
                        ${!isSelected && isTodayDate ? 'text-[#073863] font-bold bg-blue-50' : ''}
                        ${!isSelected && !isTodayDate ? 'text-gray-700 hover:bg-gray-50' : ''}
                        ${notCurrentMonth ? 'opacity-30' : ''}
                      `}
                    >
                      {format(date, 'd')}
                    </button>
                     {/* Dot Indicator */}
                     {!isSelected && eventIndicatorColor && (
                        <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${eventIndicatorColor}`} />
                      )}
                  </div>
                );
              })}
              </div>
            </div>

            {/* Selected Date Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 sticky top-0 bg-white z-10">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">
                    {format(selectedDate, 'd MMM')}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {format(selectedDate, 'EEEE')}
                    </p>
                </div>
                <div className="text-xs font-medium px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {selectedDayEvents.length} events
                </div>
            </div>

            {/* Events List - Não aceita swipe horizontal, apenas scroll vertical */}
            <div className="space-y-3 pb-10">
              {selectedDayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                        <CalendarIcon className="w-8 h-8 text-gray-200" />
                    </div>
                  <p className="text-sm font-medium text-gray-400">No events planned</p>
                </div>
              ) : (
                selectedDayEvents.map((event) => {
                    const isClickable = event.type === 'project' || event.type === 'expense';
                    
                    return (
                        <div 
                        key={event.id} 
                        onClick={() => handleEventClick(event)}
                        className={`
                            group flex gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg transition-all
                            ${isClickable ? 'cursor-pointer active:scale-[0.98]' : ''}
                        `}
                        >
                        {/* Time/Status Column */}
                        <div className="flex flex-col items-center gap-2 min-w-[45px] pt-1">
                            <span className="text-xs font-bold text-gray-400">
                                {event.time || 'All Day'}
                            </span>
                            {event.type === 'project' && <div className="h-full w-0.5 bg-blue-200 rounded-full mt-1" />}
                            {event.type === 'expense' && <div className={`h-full w-0.5 rounded-full mt-1 ${event.isPaid ? 'bg-green-200' : 'bg-red-200'}`} />}
                            {event.type === 'custom' && <div className="h-full w-0.5 bg-gray-200 rounded-full mt-1" />}
                        </div>

                        {/* Icon & Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-2">
                                {event.type === 'project' && (
                                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                        <Home className="w-5 h-5" />
                                    </div>
                                )}
                                {event.type === 'expense' && (
                                    <div className={`p-2 rounded-xl transition-colors ${event.isPaid ? 'bg-green-50 text-green-600 group-hover:bg-green-100' : 'bg-red-50 text-red-600 group-hover:bg-red-100'}`}>
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                )}
                                {event.type === 'custom' && (
                                    <div className="p-2 rounded-xl bg-gray-50 text-gray-600 group-hover:bg-gray-100 transition-colors">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                )}
                                
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <h4 className={`font-bold text-gray-900 truncate ${event.isPaid ? 'line-through text-gray-400' : ''}`}>
                                        {event.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                        {event.description || (event.type === 'project' ? 'Project Start' : 'Expense Due')}
                                    </p>
                                </div>
                            </div>

                            {/* Bottom Tags/Info */}
                            <div className="flex items-center justify-between pl-[52px]">
                                {event.amount !== undefined && (
                                    <span className={`text-sm font-bold ${event.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                        ${event.amount.toLocaleString()}
                                    </span>
                                )}
                                {event.type === 'project' && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                        {event.status?.replace('_', ' ')}
                                    </span>
                                )}
                                {event.type === 'expense' && (
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border uppercase tracking-wide ${
                                        event.isPaid 
                                        ? 'bg-green-50 text-green-700 border-green-100' 
                                        : 'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                        {event.isPaid ? 'Paid' : 'Unpaid'}
                                    </span>
                                )}
                            </div>
                        </div>
                        </div>
                    );
                })
              )}
            </div>
          </div>

          {/* Add Event Dialog (Nested) */}
          <Dialog.Root open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/20 z-[60]" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[320px] bg-white rounded-2xl shadow-xl p-6 z-[70] animate-contentShow">
                    <Dialog.Title className="text-lg font-bold text-gray-900 mb-4">New Event</Dialog.Title>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                            <input 
                                type="text" 
                                value={newEventTitle}
                                onChange={(e) => setNewEventTitle(e.target.value)}
                                placeholder="Meeting, Reminder..."
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#073863] focus:border-transparent text-sm"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                            <input 
                                type="time" 
                                value={newEventTime}
                                onChange={(e) => setNewEventTime(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#073863] text-sm"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={() => setIsAddEventOpen(false)}
                                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddEvent}
                                disabled={!newEventTitle}
                                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-[#073863] text-white hover:bg-[#094b85] transition-colors disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
