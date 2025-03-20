import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isSameDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { diagnoseFusoHorario, normalizeEmployeeDate, formatDateToISO } from '../lib/dateUtils';

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

  // Separar manipuladores de evento para desktop e touch devices
  const handleTouchStart = (date: Date) => {
    // No toque, vamos apenas alternar a data individual
    handleClick(date);
  };

  // Função para lidar com clique único (para dispositivos móveis)
  const handleClick = (date: Date) => {
    try {
      // Usar normalizeEmployeeDate para ajustar a data antes de formatá-la
      const normalizedDate = normalizeEmployeeDate(date);
      const formattedDate = formatDateToISO(normalizedDate);
      
      // Log para diagnóstico detalhado
      console.group("=== CLIQUE NO CALENDÁRIO ===");
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
    // Fechar o calendário automaticamente
    if (onClose) {
      onClose();
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

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
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

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>

      <div 
        className="grid grid-cols-7 gap-1"
        onMouseLeave={handleMouseUp}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        {daysInMonth.map(day => {
          // Usar normalizeEmployeeDate para verificar corretamente as datas
          const normalizedDate = normalizeEmployeeDate(day);
          const formattedDate = formatDateToISO(normalizedDate);
          
          // Verificar se está na seleção atual ou já marcado como trabalhado
          const isWorked = workedDates.includes(formattedDate);
          const isSelected = isSelecting && isDateInSelection(day);
          const shouldHighlight = (isSelected && isAdding) || (isWorked && !isSelected) || (isSelected && !isAdding && !isWorked);
          
          return (
            <div
              key={day.toString()}
              onMouseDown={(e) => handleMouseDown(day, e)}
              onMouseOver={() => handleMouseOver(day)}
              onTouchStart={() => handleTouchStart(day)}
              className={`
                h-10 w-full rounded-md flex items-center justify-center text-sm font-medium cursor-pointer select-none
                ${isToday(day) ? 'border-2 border-blue-500' : ''}
                ${shouldHighlight 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'hover:bg-gray-100 text-gray-700'}
                transition-colors duration-200
                active:scale-95
              `}
            >
              {format(day, 'd')}
            </div>
          );
        })}
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