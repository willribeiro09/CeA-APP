
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface MealTimeTrackerProps {
  lastMealTime?: string;
}

export const MealTimeTracker: React.FC<MealTimeTrackerProps> = ({ lastMealTime }) => {
  const [timeToNext, setTimeToNext] = useState<string>('');

  useEffect(() => {
    if (!lastMealTime) return;

    const updateTimer = () => {
      const now = new Date();
      const lastMeal = new Date();
      const [hours, minutes] = lastMealTime.split(':');
      lastMeal.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Adicionar 3 horas para próxima refeição
      const nextMeal = new Date(lastMeal.getTime() + 3 * 60 * 60 * 1000);
      
      if (now < nextMeal) {
        const diff = nextMeal.getTime() - now.getTime();
        const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
        const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeToNext(`${hoursLeft}h ${minutesLeft}m`);
      } else {
        setTimeToNext('Hora da próxima refeição!');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [lastMealTime]);

  if (!lastMealTime || !timeToNext) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
      <Clock className="h-3 w-3" />
      <span>Próxima refeição em: {timeToNext}</span>
    </div>
  );
};
