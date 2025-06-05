import { CalorieEntry, AppSettings, DailyMetrics } from '@/types';

const STORAGE_KEYS = {
  ENTRIES: 'calio_entries',
  SETTINGS: 'calio_settings',
  DAILY_METRICS: 'calio_daily_metrics'
};

export const defaultSettings: AppSettings = {
  dailyGoal: 1700,
  activeMeals: 5,
  mealNames: {
    meal1: 'Refeição 1',
    meal2: 'Refeição 2',
    meal3: 'Refeição 3',
    meal4: 'Refeição 4',
    meal5: 'Refeição 5',
    meal6: 'Refeição 6',
    meal7: 'Refeição 7',
    meal8: 'Refeição 8'
  },
  personalData: {
    name: '',
    birthDate: '',
    age: 0,
    weight: 0,
    height: 0
  },
  isFirstTime: true
};

export const getCalorieEntries = (): CalorieEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    const entries = stored ? JSON.parse(stored) : [];
    
    // Migrate old entries to new format with time fields
    return entries.map((entry: any) => ({
      ...entry,
      meals: {
        meal1: typeof entry.meals.meal1 === 'number' 
          ? { calories: entry.meals.meal1, time: '' }
          : entry.meals.meal1 || { calories: 0, time: '' },
        meal2: typeof entry.meals.meal2 === 'number' 
          ? { calories: entry.meals.meal2, time: '' }
          : entry.meals.meal2 || { calories: 0, time: '' },
        meal3: typeof entry.meals.meal3 === 'number' 
          ? { calories: entry.meals.meal3, time: '' }
          : entry.meals.meal3 || { calories: 0, time: '' },
        meal4: typeof entry.meals.meal4 === 'number' 
          ? { calories: entry.meals.meal4, time: '' }
          : entry.meals.meal4 || { calories: 0, time: '' },
        meal5: typeof entry.meals.meal5 === 'number' 
          ? { calories: entry.meals.meal5, time: '' }
          : entry.meals.meal5 || { calories: 0, time: '' },
        meal6: typeof entry.meals.meal6 === 'number' 
          ? { calories: entry.meals.meal6, time: '' }
          : entry.meals.meal6 || { calories: 0, time: '' },
        meal7: typeof entry.meals.meal7 === 'number' 
          ? { calories: entry.meals.meal7, time: '' }
          : entry.meals.meal7 || { calories: 0, time: '' },
        meal8: typeof entry.meals.meal8 === 'number' 
          ? { calories: entry.meals.meal8, time: '' }
          : entry.meals.meal8 || { calories: 0, time: '' }
      },
      exercises: entry.exercises || { minutes: 0, caloriesBurned: 0 },
      netCalories: entry.netCalories || (entry.total - (entry.exercises?.caloriesBurned || 0))
    }));
  } catch (error) {
    console.error('Error loading calorie entries:', error);
    return [];
  }
};

export const saveCalorieEntry = (entry: CalorieEntry): void => {
  try {
    const entries = getCalorieEntries();
    const existingIndex = entries.findIndex(e => e.date === entry.date);
    
    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }
    
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving calorie entry:', error);
  }
};

export const getSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const settings = stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    
    // Ensure activeMeals is set
    if (!settings.activeMeals) {
      settings.activeMeals = 5;
    }
    
    // Ensure personalData exists
    if (!settings.personalData) {
      settings.personalData = defaultSettings.personalData;
    }

    // Ensure isFirstTime exists
    if (settings.isFirstTime === undefined) {
      settings.isFirstTime = true;
    }
    
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export const getDailyMetrics = (): DailyMetrics[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DAILY_METRICS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading daily metrics:', error);
    return [];
  }
};

export const saveDailyMetric = (metric: DailyMetrics): void => {
  try {
    const metrics = getDailyMetrics();
    const existingIndex = metrics.findIndex(m => m.date === metric.date);
    
    if (existingIndex >= 0) {
      metrics[existingIndex] = metric;
    } else {
      metrics.push(metric);
    }
    
    localStorage.setItem(STORAGE_KEYS.DAILY_METRICS, JSON.stringify(metrics));
  } catch (error) {
    console.error('Error saving daily metric:', error);
  }
};

export const exportData = (): string => {
  const entries = getCalorieEntries();
  
  const csvHeader = 'Data,Refeição 1,Horário 1,Refeição 2,Horário 2,Refeição 3,Horário 3,Refeição 4,Horário 4,Refeição 5,Horário 5,Exercícios (min),Calorias Queimadas,Total,Líquido\n';
  const csvRows = entries.map(entry => 
    `${entry.date},${entry.meals.meal1?.calories || 0},${entry.meals.meal1?.time || ''},${entry.meals.meal2?.calories || 0},${entry.meals.meal2?.time || ''},${entry.meals.meal3?.calories || 0},${entry.meals.meal3?.time || ''},${entry.meals.meal4?.calories || 0},${entry.meals.meal4?.time || ''},${entry.meals.meal5?.calories || 0},${entry.meals.meal5?.time || ''},${entry.exercises.minutes},${entry.exercises.caloriesBurned},${entry.total},${entry.netCalories}`
  ).join('\n');
  
  return csvHeader + csvRows;
};
