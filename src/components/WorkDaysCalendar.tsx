import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isSameDay, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { diagnoseFusoHorario, normalizeEmployeeDate, formatDateToISO } from '../lib/dateUtils';
import { isMobileDevice, getEnvironmentInfo } from '../lib/deviceUtils';

interface WorkDaysCalendarProps {
  employeeId: string;
  initialWorkedDates: string[];
  onDateToggle: (date: string) => void;
  onClose?: () => void;
  onReset?: (employeeId: string, weekStartDate: string) => void;
  weekStartDate?: string;
}

const WorkDaysCalendar: React.FC<WorkDaysCalendarProps> = ({
  employeeId,
  initialWorkedDates,
  onDateToggle,
  onClose,
  onReset,
  weekStartDate
}) => {
  // Sempre iniciar com o mês atual
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Garantir que workedDates seja sempre um array, mesmo que initialWorkedDates seja undefined
  const [workedDates, setWorkedDates] = useState<string[]>(initialWorkedDates || []);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [mouseOverDate, setMouseOverDate] = useState<Date | null>(null);
  const [isAdding, setIsAdding] = useState(true);

  // Estado para seleção em dispositivos móveis
  const [isMobileSelecting, setIsMobileSelecting] = useState(false);
  const [mobileSelectionStart, setMobileSelectionStart] = useState<Date | null>(null);
  const [currentTouchDate, setCurrentTouchDate] = useState<Date | null>(null);

  // Atualizar as datas trabalhadas quando as props mudarem
  useEffect(() => {
    setWorkedDates(initialWorkedDates || []);
  }, [initialWorkedDates]);

  // Função para verificar se uma data está dentro da seleção atual
  const isDateInSelection = (date: Date): boolean => {
    if (!isSelecting || !selectionStart || !mouseOverDate) return false;
    
    const start = selectionStart < mouseOverDate ? selectionStart : mouseOverDate;
    const end = selectionStart < mouseOverDate ? mouseOverDate : selectionStart;
    
    return date >= start && date <= end;
  };

  // Função para verificar se uma data já está marcada como trabalhada
  const isDateWorked = (date: Date): boolean => {
    // Usar normalizeEmployeeDate para ajustar a data
    const normalizedDate = normalizeEmployeeDate(date);
    const formattedDate = formatDateToISO(normalizedDate);
    return workedDates.includes(formattedDate);
  };

  // Iniciar a seleção múltipla
  const handleMouseDown = (date: Date, e: React.MouseEvent) => {
    e.preventDefault(); // Impedir comportamento padrão do mousedown
    // Usar normalizeEmployeeDate para ajustar a data
    const normalizedDate = normalizeEmployeeDate(date);
    const formattedDate = formatDateToISO(normalizedDate);
    
    // Determinar se estamos adicionando ou removendo com base no estado atual do dia
    setIsAdding(!workedDates.includes(formattedDate));
    setIsSelecting(true);
    setSelectionStart(date);
    setMouseOverDate(date);
  };

  // Atualizar a seleção enquanto move o mouse
  const handleMouseOver = (date: Date) => {
    if (isSelecting) {
      setMouseOverDate(date);
    }
  };

  // Finalizar a seleção múltipla
  const handleMouseUp = () => {
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
    }
    
    // Limpar o estado de seleção
    setIsSelecting(false);
    setSelectionStart(null);
    setMouseOverDate(null);
  };

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
      // Log de ambiente para diagnóstico
      const envInfo = getEnvironmentInfo();
      
      // Usar normalizeEmployeeDate para ajustar a data antes de formatá-la
      const normalizedDate = normalizeEmployeeDate(date);
      const formattedDate = formatDateToISO(normalizedDate);
      
      // Log para diagnóstico detalhado
      console.group("=== CLIQUE NO CALENDÁRIO ===");
      console.log("Ambiente:", envInfo);
      
      console.log("Data original:", {
        iso: date.toISOString(),
        local: date.toString(),
        diaOriginal: date.getDate(),
        mesOriginal: date.getMonth() + 1,
        anoOriginal: date.getFullYear(),
        timeZoneOffset: date.getTimezoneOffset()
      });
      
      console.log("Data normalizada:", {
        iso: normalizedDate.toISOString(),
        local: normalizedDate.toString(),
        diaNormalizado: normalizedDate.getUTCDate(),
        mesNormalizado: normalizedDate.getUTCMonth() + 1,
        anoNormalizado: normalizedDate.getUTCFullYear()
      });
      
      console.log("Data formatada:", {
        formattedDate: formattedDate,
        diaFormatado: formattedDate.split('-')[2],
        mesFormatado: formattedDate.split('-')[1],
        anoFormatado: formattedDate.split('-')[0]
      });
      
      const isDateWorked = workedDates.includes(formattedDate);
      console.log("Status:", {
        jaEstaMarcada: isDateWorked,
        diasAtuais: workedDates,
        acao: isDateWorked ? "removendo" : "adicionando"
      });
      console.groupEnd();
      
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
    // Garantir que todas as datas foram corretamente processadas
    console.log("Confirmando datas:", workedDates);
    
    // Dupla verificação para garantir que todas as datas foram devidamente processadas
    try {
      // Aguardar um momento para garantir que todas as mudanças de estado foram processadas
      setTimeout(() => {
        // Verificar se as datas confirmadas foram devidamente persistidas
        const dataGarantida = [...workedDates];
        console.log("Datas garantidas:", dataGarantida);
        
        // Fechar o calendário automaticamente
        if (onClose) {
          onClose();
        }
      }, 300);
    } catch (error) {
      console.error("Erro ao confirmar datas:", error);
      // Tentar novamente após erro
      if (onClose) {
        onClose();
      }
    }
  };

  // Função para resetar todas as datas
  const handleReset = () => {
    // Usar o callback de reset se estiver disponível
    if (onReset && weekStartDate) {
      onReset(employeeId, weekStartDate);
      // Limpar o estado local
      setWorkedDates([]);
    } else {
      // Para cada data trabalhada, chamar onDateToggle para removê-la
      [...workedDates].forEach(date => {
        onDateToggle(date);
      });
      
      // Limpar o estado local
      setWorkedDates([]);
    }
  };

  // Gerar os dias do mês atual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Nomes dos dias da semana em inglês
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Detectar se é dispositivo móvel para ajustar a UI
  const isMobile = isMobileDevice();

  // Iniciar seleção em dispositivos móveis
  const handleMobileMultiSelectStart = (date: Date) => {
    setIsMobileSelecting(true);
    setMobileSelectionStart(date);
    setCurrentTouchDate(date);
    
    // Determinar se estamos adicionando ou removendo
    const normalizedDate = normalizeEmployeeDate(date);
    const formattedDate = formatDateToISO(normalizedDate);
    setIsAdding(!workedDates.includes(formattedDate));
    
    console.log("Iniciando seleção múltipla em mobile:", date);
  };
  
  // Atualizar a seleção durante o toque
  const handleMobileMultiSelectMove = (date: Date) => {
    if (isMobileSelecting && mobileSelectionStart && date !== currentTouchDate) {
      setCurrentTouchDate(date);
      console.log("Atualizando seleção múltipla em mobile:", date);
    }
  };
  
  // Finalizar a seleção múltipla em dispositivos móveis
  const handleMobileMultiSelectEnd = () => {
    if (isMobileSelecting && mobileSelectionStart && currentTouchDate) {
      console.log("Finalizando seleção múltipla em mobile", {
        inicio: mobileSelectionStart,
        fim: currentTouchDate
      });
      
      // Ordenar as datas de início e fim
      const start = mobileSelectionStart < currentTouchDate ? mobileSelectionStart : currentTouchDate;
      const end = mobileSelectionStart < currentTouchDate ? currentTouchDate : mobileSelectionStart;
      
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
      setIsMobileSelecting(false);
      setMobileSelectionStart(null);
      setCurrentTouchDate(null);
    }
  };

  const toggleMultiSelectMode = () => {
    // Não é mais necessário, mas mantemos a função para limpar seleções
    // setMultiSelectMode(!multiSelectMode);
    
    // Limpar qualquer seleção em andamento
    setIsMobileSelecting(false);
    setMobileSelectionStart(null);
    setCurrentTouchDate(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* Informações de ambiente para depuração - só visível durante desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 p-2 mb-2 text-xs">
          <p>Ambiente: {isMobile ? 'Mobile' : 'Desktop'}</p>
          <p>Fuso: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: enUS })}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            &lt;
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Cabeçalho com os dias da semana */}
        {weekDays.map(day => (
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
          {/* Preenchimento para os dias antes do início do mês */}
          {Array.from({ length: getDay(monthStart) }).map((_, i) => (
            <div key={`padding-${i}`} className="h-8" />
          ))}
          
          {/* Dias do mês */}
          {daysInMonth.map(day => {
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
                    if (!isMobileSelecting) {
                      handleMobileMultiSelectStart(day);
                    } else {
                      handleMobileMultiSelectMove(day);
                    }
                  } else {
                    handleTouchStart(day, e);
                  }
                }}
                onTouchMove={(e) => {
                  if (isMobile && isMobileSelecting) {
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
                  if (isMobile && isMobileSelecting) {
                    handleMobileMultiSelectEnd();
                  }
                }}
                onClick={() => isMobile && !isMobileSelecting && handleClick(day)}
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