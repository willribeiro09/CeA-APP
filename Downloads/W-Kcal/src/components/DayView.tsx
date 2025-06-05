import React, { useState, useEffect } from 'react';
import { ArrowLeft, Target, Plus, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EditableMealName } from '@/components/EditableMealName';
import { DailyMetrics } from '@/components/DailyMetrics';
import { MealTimeTracker } from '@/components/MealTimeTracker';
import { CalorieEntry, AppSettings, CalorieStatus, DailyMetrics as IDailyMetrics } from '@/types';
import { formatDate, formatDisplayDate } from '@/utils/dateUtils';
import { saveCalorieEntry, saveSettings } from '@/utils/storage';

interface DayViewProps {
  selectedDate: Date;
  onBack: () => void;
  entry?: CalorieEntry;
  settings: AppSettings;
  onEntryUpdate: (entry: CalorieEntry) => void;
  dailyMetrics: IDailyMetrics[];
  onMetricsUpdate: (metrics: IDailyMetrics) => void;
}

const getCalorieStatus = (netCalories: number, goal: number): CalorieStatus => {
  if (netCalories === 0) return 'under';
  if (netCalories < goal * 0.8) return 'under';
  if (netCalories <= goal * 1.2) return 'optimal';
  return 'over';
};

export const DayView: React.FC<DayViewProps> = ({
  selectedDate,
  onBack,
  entry,
  settings,
  onEntryUpdate,
  dailyMetrics,
  onMetricsUpdate
}) => {
  const [meals, setMeals] = useState({
    meal1: { calories: entry?.meals.meal1?.calories || 0, time: entry?.meals.meal1?.time || '' },
    meal2: { calories: entry?.meals.meal2?.calories || 0, time: entry?.meals.meal2?.time || '' },
    meal3: { calories: entry?.meals.meal3?.calories || 0, time: entry?.meals.meal3?.time || '' },
    meal4: { calories: entry?.meals.meal4?.calories || 0, time: entry?.meals.meal4?.time || '' },
    meal5: { calories: entry?.meals.meal5?.calories || 0, time: entry?.meals.meal5?.time || '' },
    meal6: { calories: entry?.meals.meal6?.calories || 0, time: entry?.meals.meal6?.time || '' },
    meal7: { calories: entry?.meals.meal7?.calories || 0, time: entry?.meals.meal7?.time || '' },
    meal8: { calories: entry?.meals.meal8?.calories || 0, time: entry?.meals.meal8?.time || '' }
  });

  const [exercises, setExercises] = useState({
    minutes: entry?.exercises.minutes || 0,
    caloriesBurned: entry?.exercises.caloriesBurned || 0
  });

  const [currentSettings, setCurrentSettings] = useState(settings);
  
  const total = Object.values(meals).reduce((sum, meal) => sum + meal.calories, 0);
  const netCalories = total - exercises.caloriesBurned;
  const remainingCalories = currentSettings.dailyGoal - netCalories;
  const status = getCalorieStatus(netCalories, currentSettings.dailyGoal);
  const progressPercentage = Math.min(100, (netCalories / currentSettings.dailyGoal) * 100);

  // Encontrar o horário da última refeição
  const lastMealTime = Object.values(meals)
    .filter(meal => meal.time && meal.calories > 0)
    .sort((a, b) => a.time.localeCompare(b.time))
    .pop()?.time;

  // Auto-save quando dados mudam
  useEffect(() => {
    const saveData = () => {
      const newEntry: CalorieEntry = {
        id: entry?.id || Date.now().toString(),
        date: formatDate(selectedDate),
        meals,
        exercises,
        total,
        netCalories
      };
      
      saveCalorieEntry(newEntry);
      onEntryUpdate(newEntry);
    };

    const timeoutId = setTimeout(saveData, 500); // Auto-save após 500ms de inatividade
    return () => clearTimeout(timeoutId);
  }, [meals, exercises, total, netCalories]);

  const handleMealChange = (mealType: keyof typeof meals, field: 'calories' | 'time', value: string) => {
    if (field === 'calories') {
      const numValue = Math.max(0, parseInt(value) || 0);
      setMeals(prev => ({
        ...prev,
        [mealType]: { ...prev[mealType], calories: numValue }
      }));
    } else {
      setMeals(prev => ({
        ...prev,
        [mealType]: { ...prev[mealType], time: value }
      }));
    }
  };

  const handleExerciseChange = (field: 'minutes' | 'caloriesBurned', value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setExercises(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleMealNameChange = (mealKey: keyof typeof currentSettings.mealNames, newName: string) => {
    const updatedSettings = {
      ...currentSettings,
      mealNames: {
        ...currentSettings.mealNames,
        [mealKey]: newName
      }
    };
    setCurrentSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleAddMeal = () => {
    if (currentSettings.activeMeals < 8) {
      const updatedSettings = {
        ...currentSettings,
        activeMeals: currentSettings.activeMeals + 1
      };
      setCurrentSettings(updatedSettings);
      saveSettings(updatedSettings);
    }
  };

  const activeMealKeys = Array.from(
    { length: currentSettings.activeMeals }, 
    (_, i) => `meal${i + 1}` as keyof typeof meals
  );

  // Cores vibrantes e variadas para as refeições
  const getMealCardColors = (index: number) => {
    const colors = [
      'bg-gradient-to-br from-violet-200 via-purple-100 to-violet-50 border-violet-400 shadow-violet-200/30',
      'bg-gradient-to-br from-blue-200 via-indigo-100 to-blue-50 border-blue-400 shadow-blue-200/30',
      'bg-gradient-to-br from-emerald-200 via-teal-100 to-emerald-50 border-emerald-400 shadow-emerald-200/30',
      'bg-gradient-to-br from-rose-200 via-pink-100 to-rose-50 border-rose-400 shadow-rose-200/30',
      'bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-50 border-amber-400 shadow-amber-200/30',
      'bg-gradient-to-br from-cyan-200 via-sky-100 to-cyan-50 border-cyan-400 shadow-cyan-200/30',
      'bg-gradient-to-br from-purple-200 via-fuchsia-100 to-purple-50 border-purple-400 shadow-purple-200/30',
      'bg-gradient-to-br from-green-200 via-lime-100 to-green-50 border-green-400 shadow-green-200/30'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Date Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {formatDisplayDate(selectedDate)}
        </h1>
      </div>

      {/* Enhanced Progress Section */}
      <Card className={`p-5 border shadow-sm ${
        status === 'optimal' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' :
        status === 'over' ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200' :
        'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
      } rounded-2xl`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                status === 'optimal' ? 'bg-green-100 text-green-700' :
                status === 'over' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Meta Diária</h3>
                <MealTimeTracker lastMealTime={lastMealTime} />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Progress 
              value={progressPercentage} 
              className="h-4 bg-white/50 rounded-full"
            />
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-3 border border-amber-200 shadow-sm">
                <div className="text-xl font-bold text-amber-800">{total}</div>
                <div className="text-xs text-amber-700 font-medium">Consumidas</div>
              </div>
              <div className={`rounded-xl p-3 border shadow-sm ${
                remainingCalories >= 0 
                  ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-200' 
                  : 'bg-gradient-to-br from-red-100 to-rose-100 border-red-200'
              }`}>
                <div className={`text-xl font-bold ${
                  remainingCalories >= 0 ? 'text-green-800' : 'text-red-800'
                }`}>
                  {remainingCalories >= 0 ? remainingCalories : `-${Math.abs(remainingCalories)}`}
                </div>
                <div className={`text-xs font-medium ${
                  remainingCalories >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {remainingCalories >= 0 ? 'Restantes' : 'Excedido'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-3 border border-blue-200 shadow-sm">
                <div className="text-xl font-bold text-blue-800">{currentSettings.dailyGoal}</div>
                <div className="text-xs text-blue-700 font-medium">Meta</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Meals with subtle borders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Refeições</h2>
          {currentSettings.activeMeals < 8 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddMeal}
              className="text-purple-600 hover:bg-purple-50 text-sm rounded-xl border border-purple-200 bg-purple-50/50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
        
        <div className="grid gap-3">
          {activeMealKeys.map((key, index) => (
            <Card key={key} className="p-4 bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 rounded-xl shadow-sm">
              <div className="space-y-3">
                <EditableMealName
                  mealName={currentSettings.mealNames[key]}
                  onSave={(newName) => handleMealNameChange(key, newName)}
                />
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={meals[key].calories || ''}
                      onChange={(e) => handleMealChange(key, 'calories', e.target.value)}
                      placeholder="0"
                      className="w-24 text-center h-9 bg-white border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-sm rounded-lg transition-all duration-200 shadow-sm font-medium"
                    />
                    <span className="text-gray-700 text-sm font-medium">cal</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={meals[key].time || ''}
                      onChange={(e) => handleMealChange(key, 'time', e.target.value)}
                      className="w-28 text-center h-9 bg-white border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-sm rounded-lg transition-all duration-200 shadow-sm font-medium"
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Exercises Section */}
      <Card className="p-5 border border-orange-200 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-200 to-red-200 rounded-2xl flex items-center justify-center shadow-sm">
              <Dumbbell className="h-6 w-6 text-orange-800" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Exercícios</h3>
              <p className="text-sm text-gray-700">Atividade física do dia</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-800 mb-2 block">Minutos</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={exercises.minutes || ''}
                  onChange={(e) => handleExerciseChange('minutes', e.target.value)}
                  placeholder="0"
                  className="text-center h-10 bg-white border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 rounded-lg transition-all duration-200 shadow-sm font-medium"
                />
                <span className="text-gray-700 text-sm font-medium">min</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-800 mb-2 block">Queimadas</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={exercises.caloriesBurned || ''}
                  onChange={(e) => handleExerciseChange('caloriesBurned', e.target.value)}
                  placeholder="0"
                  className="text-center h-10 bg-white border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 rounded-lg transition-all duration-200 shadow-sm font-medium"
                />
                <span className="text-gray-700 text-sm font-medium">cal</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Daily Metrics Section */}
      <DailyMetrics
        selectedDate={selectedDate}
        personalData={settings.personalData}
        dailyMetrics={dailyMetrics}
        onMetricsUpdate={onMetricsUpdate}
      />
    </div>
  );
};
