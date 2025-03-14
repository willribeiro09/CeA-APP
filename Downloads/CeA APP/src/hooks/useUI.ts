import { useState, useCallback, useEffect } from 'react';
import { Category, FeedbackType } from '../types';

/**
 * Hook para gerenciar o estado da interface do usuário
 */
export function useUI() {
  // Estado para armazenar a categoria ativa
  const [activeCategory, setActiveCategory] = useState<Category>('expenses');
  
  // Estado para controlar a visibilidade do calendário
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  
  // Estado para controlar a visibilidade do diálogo de adição
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  
  // Estado para controlar a visibilidade do diálogo de edição
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  
  // Estado para controlar a visibilidade do diálogo de taxa
  const [isRateDialogOpen, setIsRateDialogOpen] = useState<boolean>(false);
  
  // Estado para controlar a visibilidade dos dropdowns
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Estado para controlar o status de salvamento
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Estado para armazenar mensagens de feedback
  const [feedback, setFeedback] = useState<{ type: FeedbackType; message: string } | null>(null);
  
  // Limpa o feedback após 3 segundos
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  
  // Abre o calendário
  const openCalendar = useCallback(() => {
    setIsCalendarOpen(true);
  }, []);
  
  // Fecha o calendário
  const closeCalendar = useCallback(() => {
    setIsCalendarOpen(false);
  }, []);
  
  // Abre o diálogo de adição
  const openAddDialog = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);
  
  // Fecha o diálogo de adição
  const closeAddDialog = useCallback(() => {
    setIsAddDialogOpen(false);
  }, []);
  
  // Abre o diálogo de edição
  const openEditDialog = useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);
  
  // Fecha o diálogo de edição
  const closeEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
  }, []);
  
  // Abre o diálogo de taxa
  const openRateDialog = useCallback(() => {
    setIsRateDialogOpen(true);
  }, []);
  
  // Fecha o diálogo de taxa
  const closeRateDialog = useCallback(() => {
    setIsRateDialogOpen(false);
  }, []);
  
  // Alterna a visibilidade de um dropdown
  const toggleDropdown = useCallback((id: string) => {
    setOpenDropdown(prev => (prev === id ? null : id));
  }, []);
  
  // Fecha todos os dropdowns
  const closeAllDropdowns = useCallback(() => {
    setOpenDropdown(null);
  }, []);
  
  // Mostra uma mensagem de feedback
  const showFeedback = useCallback((type: FeedbackType, message: string) => {
    setFeedback({ type, message });
  }, []);
  
  return {
    activeCategory,
    setActiveCategory,
    isCalendarOpen,
    openCalendar,
    closeCalendar,
    isAddDialogOpen,
    openAddDialog,
    closeAddDialog,
    isEditDialogOpen,
    openEditDialog,
    closeEditDialog,
    isRateDialogOpen,
    openRateDialog,
    closeRateDialog,
    openDropdown,
    toggleDropdown,
    closeAllDropdowns,
    isSaving,
    setIsSaving,
    feedback,
    showFeedback
  };
} 