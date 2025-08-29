import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isToday, isSameMonth } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { normalizeEmployeeDate, formatDateToISO } from '../lib/dateUtils';
import { isMobileDevice } from '../lib/deviceUtils';

interface WorkDaysCalendarProps {
  initialWorkedDates: string[];
  onDateToggle: (date: string) => void;
  weekStartDate: Date;
  onWeekChange: (startDate: Date, endDate: Date) => void;
  // Props adicionais que podem ser passadas
  employeeId?: string;
  onClose?: () => void;
  onReset?: () => void;
}

export function WorkDaysCalendar({ 
  initialWorkedDates, 
  onDateToggle, 
  weekStartDate, 
  onWeekChange,
  onClose
}: WorkDaysCalendarProps) {
  const [workedDates, setWorkedDates] = useState<string[]>(initialWorkedDates || []);
  const [currentMonth, setCurrentMonth] = useState(new Date(weekStartDate));
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [mouseOverDate, setMouseOverDate] = useState<Date | null>(null);
  const [isAdding, setIsAdding] = useState(true);
  const [mobileSelectionStart, setMobileSelectionStart] = useState<Date | null>(null);
  const [currentTouchDate, setCurrentTouchDate] = useState<Date | null>(null);

  // Usar useMemo para calcular o mês completo
  const monthRange = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return { start, end };
  }, [currentMonth]);

  const monthDays = useMemo(() => {
    const { start, end } = monthRange;
    const startOfFirstWeek = startOfWeek(start, { weekStartsOn: 1 }); // Segunda-feira
    const endOfLastWeek = endOfWeek(end, { weekStartsOn: 1 }); // Domingo
    return eachDayOfInterval({ start: startOfFirstWeek, end: endOfLastWeek });
  }, [monthRange]);

  const monthLabel = useMemo(() => {
    return format(currentMonth, 'MMMM yyyy', { locale: enUS });
  }, [currentMonth]);

  // Atualizar as datas trabalhadas quando as props mudarem
  useEffect(() => {
    setWorkedDates(initialWorkedDates || []);
  }, [initialWorkedDates]);

  // Função para verificar se uma data está dentro da seleção atual
  const isDateInSelection = useCallback((date: Date): boolean => {
    if (!isSelecting || !selectionStart || !mouseOverDate) return false;
    
    const start = selectionStart < mouseOverDate ? selectionStart : mouseOverDate;
    const end = selectionStart < mouseOverDate ? mouseOverDate : selectionStart;
    
    return date >= start && date <= end;
  }, [isSelecting, selectionStart, mouseOverDate]);

  // Função para verificar se uma data já está marcada como trabalhada
  const isDateWorked = useCallback((date: Date): boolean => {
    // Usar normalizeEmployeeDate para ajustar a data
    const normalizedDate = normalizeEmployeeDate(date);
    const formattedDate = formatDateToISO(normalizedDate);
    return workedDates.includes(formattedDate);
  }, [workedDates]);

  // Iniciar a seleção múltipla
  const handleMouseDown = useCallback((date: Date, e: React.MouseEvent) => {
    e.preventDefault(); // Impedir comportamento padrão do mousedown
    // Usar normalizeEmployeeDate para ajustar a data
    const normalizedDate = normalizeEmployeeDate(date);
    const formattedDate = formatDateToISO(normalizedDate);
    
    // Determinar se estamos adicionando ou removendo com base no estado atual do dia
    setIsAdding(!workedDates.includes(formattedDate));
    setIsSelecting(true);
    setSelectionStart(date);
    setMouseOverDate(date);
  }, [workedDates]);

  // Atualizar a seleção enquanto move o mouse
  const handleMouseOver = useCallback((date: Date) => {
    if (isSelecting) {
      setMouseOverDate(date);
    }
  }, [isSelecting]);

  // Finalizar a seleção múltipla
  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionStart && mouseOverDate) {
      // Ordenar as datas de início e fim
      const start = selectionStart < mouseOverDate ? selectionStart : mouseOverDate;
      const end = selectionStart < mouseOverDate ? mouseOverDate : selectionStart;
      
      // Obter todas as datas no intervalo
      const datesInRange = eachDayOfInterval({ start, end });
      
      // Aplicar a operação (adicionar ou remover) a todas as datas no intervalo
      datesInRange.forEach(date => {
        // Usar normalizeEmployeeDate para ajustar a data
        const normalizedDate = normalizeEmployeeDate(date);
        const formattedDate = formatDateToISO(normalizedDate);
        
        const isCurrentlyWorked = workedDates.includes(formattedDate);
        
        // Se estamos adicionando e não está marcado, ou removendo e está marcado
        if ((isAdding && !isCurrentlyWorked) || (!isAdding && isCurrentlyWorked)) {
          onDateToggle(formattedDate);
          
          // Atualizar o estado local para refletir a mudança
          if (isAdding) {
            setWorkedDates(prev => [...prev, formattedDate]);
          } else {
            setWorkedDates(prev => prev.filter(d => d !== formattedDate));
          }
        }
      });
      
      // Limpar o estado de seleção
      setIsSelecting(false);
      setMobileSelectionStart(null);
      setCurrentTouchDate(null);
    }
    
    // Limpar o estado de seleção
    setIsSelecting(false);
    setSelectionStart(null);
    setMouseOverDate(null);
  }, [isSelecting, selectionStart, mouseOverDate, isAdding, workedDates, onDateToggle]);

  // Para dispositivos móveis, melhorar a área de toque
  const mobileStyles = isMobileDevice() ? 
    { 
      padding: '16px', 
      minHeight: '44px', 
      minWidth: '44px',
      touchAction: 'manipulation' as const,
      WebkitTapHighlightColor: 'transparent' as const,
      userSelect: 'none' as const
    } : 
    {};

  // Separar manipuladores de evento para desktop e touch devices
  const handleTouchStart = (date: Date, e: React.TouchEvent) => {
    try {
      e.preventDefault(); // Prevenir comportamentos padrão que possam interferir
      
      // Para dispositivos móveis, melhorar o feedback visual
      const target = e.currentTarget as HTMLDivElement;
      target.style.opacity = '0.7';
      
      // Usar a função de clique individual
      handleClick(date);
      
      // Restaurar a opacidade após breve delay
      setTimeout(() => {
        if (target) target.style.opacity = '1';
      }, 200);
    } catch (error) {
      console.error("Erro no touch start:", error);
    }
  };

  // Função para lidar com clique único (para dispositivos móveis)
  const handleClick = (date: Date) => {
    try {
      // Usar normalizeEmployeeDate para ajustar a data antes de formatá-la
      const normalizedDate = normalizeEmployeeDate(date);
      const formattedDate = formatDateToISO(normalizedDate);
      
      const isDateWorked = workedDates.includes(formattedDate);
      
      // Alternar o estado de trabalho da data
      onDateToggle(formattedDate);
      
      // Atualizar o estado local
      if (isDateWorked) {
        setWorkedDates(prev => prev.filter(d => d !== formattedDate));
      } else {
        setWorkedDates(prev => [...prev, formattedDate]);
      }
    } catch (error) {
      console.error("Erro ao processar clique no calendário:", error);
    }
  };

  // Função para confirmar todas as datas selecionadas
  const handleConfirm = () => {
    try {
      console.log('✅ Confirmando datas trabalhadas:', workedDates);
      
      // Garantir que todas as datas foram corretamente processadas
      // As datas já foram salvas via onDateToggle durante a seleção
      
      // Fechar o modal se a prop onClose estiver disponível
      if (onClose) {
        onClose();
      }
      
      // Disparar evento de confirmação
      window.dispatchEvent(new CustomEvent('workDaysConfirmed', { 
        detail: { 
          workedDates,
          message: 'Datas trabalhadas confirmadas com sucesso!'
        } 
      }));
      
    } catch (error) {
      console.error("Erro ao confirmar datas:", error);
    }
  };

  // Função para resetar todas as datas
  const handleReset = () => {
    // Para cada data trabalhada, chamar onDateToggle para removê-la
    workedDates.forEach(date => {
      onDateToggle(date);
    });
    
    // Limpar o estado local
    setWorkedDates([]);
  };

  // Funções para seleção múltipla em dispositivos móveis
  const handleMobileMultiSelectStart = (date: Date) => {
    const normalizedDate = normalizeEmployeeDate(date);
    const formattedDate = formatDateToISO(normalizedDate);
    
    setIsAdding(!workedDates.includes(formattedDate));
    setIsSelecting(true);
    setMobileSelectionStart(date);
    setCurrentTouchDate(date);
  };

  const handleMobileMultiSelectMove = (date: Date) => {
    if (isSelecting) {
      setCurrentTouchDate(date);
    }
  };

  const handleMobileMultiSelectEnd = () => {
    if (isSelecting && mobileSelectionStart && currentTouchDate) {
      const start = mobileSelectionStart < currentTouchDate ? mobileSelectionStart : currentTouchDate;
      const end = mobileSelectionStart < currentTouchDate ? currentTouchDate : mobileSelectionStart;
      
      const datesInRange = eachDayOfInterval({ start, end });
      
      datesInRange.forEach(date => {
        const normalizedDate = normalizeEmployeeDate(date);
        const formattedDate = formatDateToISO(normalizedDate);
        
        const isCurrentlyWorked = workedDates.includes(formattedDate);
        
        if ((isAdding && !isCurrentlyWorked) || (!isAdding && isCurrentlyWorked)) {
          onDateToggle(formattedDate);
          
          if (isAdding) {
            setWorkedDates(prev => [...prev, formattedDate]);
          } else {
            setWorkedDates(prev => prev.filter(d => d !== formattedDate));
          }
        }
      });
    }
    
    setIsSelecting(false);
    setMobileSelectionStart(null);
    setCurrentTouchDate(null);
  };

  // Verificar se é dispositivo móvel
  const isMobile = isMobileDevice();

  // Labels dos dias da semana
  const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 capitalize">
          {monthLabel}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
              setCurrentMonth(newMonth);
              onWeekChange(newMonth, new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0));
            }}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            &lt;
          </button>
          <button
            onClick={() => {
              const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
              setCurrentMonth(newMonth);
              onWeekChange(newMonth, new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0));
            }}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Cabeçalho com os dias da semana */}
        {weekDayLabels.map(day => (
          <div key={day} className="text-center font-medium text-gray-500 text-sm">
            {day}
          </div>
        ))}
        
        {/* Dias do mês e eventos do mouse */}
        <div 
          className="grid grid-cols-7 gap-1 col-span-7"
          onMouseLeave={handleMouseUp}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
        >
          {/* Dias do mês */}
          {monthDays.map(day => {
            // Usar normalizeEmployeeDate para verificar corretamente as datas
            const normalizedDate = normalizeEmployeeDate(day);
            const formattedDate = formatDateToISO(normalizedDate);
            
            // Verificar se está na seleção atual ou já marcado como trabalhado
            const isWorked = workedDates.includes(formattedDate);
            const isSelected = isSelecting && isDateInSelection(day);
            const shouldHighlight = (isSelected && isAdding) || (isWorked && !isSelected) || (isSelected && !isAdding && !isWorked);
            
            // Classes para estilização combinando as abordagens anteriores
            const dayClasses = [
              "flex items-center justify-center",
              "cursor-pointer select-none",
              "transition-colors duration-200",
              isToday(day) ? "border-2 border-blue-500" : "",
              shouldHighlight 
                ? "bg-green-500 text-white hover:bg-green-600" 
                : "hover:bg-gray-100 text-gray-700",
              isMobile ? "h-10 w-10" : "h-8 w-8",
              "rounded-md"
            ].filter(Boolean).join(" ");
            
            return (
              <div
                key={day.toString()}
                className={dayClasses}
                style={mobileStyles}
                onMouseDown={(e) => handleMouseDown(day, e)}
                onMouseOver={() => handleMouseOver(day)}
                onTouchStart={(e) => {
                  if (isMobile) {
                    e.preventDefault();
                    if (!isSelecting) {
                      handleMobileMultiSelectStart(day);
                    } else {
                      handleMobileMultiSelectMove(day);
                    }
                  } else {
                    handleClick(day);
                  }
                }}
                onTouchMove={(e) => {
                  if (isMobile && isSelecting) {
                    e.preventDefault();
                    
                    // Identificar o elemento sob o toque
                    const touch = e.touches[0];
                    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                    
                    // Verificar se é um dia do calendário
                    if (elem && elem.hasAttribute('data-date')) {
                      const dateStr = elem.getAttribute('data-date');
                      if (dateStr) {
                        const date = new Date(dateStr);
                        handleMobileMultiSelectMove(date);
                      }
                    }
                  }
                }}
                onTouchEnd={() => {
                  if (isMobile && isSelecting) {
                    handleMobileMultiSelectEnd();
                  }
                }}
                onClick={() => isMobile && !isSelecting && handleClick(day)}
                data-date={format(day, 'yyyy-MM-dd')}
                aria-label={`${day.getDate()} ${format(day, 'MMMM yyyy')}`}
                role="button"
                tabIndex={0}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botões de Confirm e Reset */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
        >
          Reset All Days
        </button>
      </div>
    </div>
  );
};

export default WorkDaysCalendar; 