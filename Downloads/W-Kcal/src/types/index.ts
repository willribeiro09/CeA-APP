
export interface CalorieEntry {
  id: string;
  date: string;
  meals: {
    meal1: { calories: number; time?: string };
    meal2: { calories: number; time?: string };
    meal3: { calories: number; time?: string };
    meal4: { calories: number; time?: string };
    meal5: { calories: number; time?: string };
    meal6?: { calories: number; time?: string };
    meal7?: { calories: number; time?: string };
    meal8?: { calories: number; time?: string };
  };
  exercises: {
    minutes: number;
    caloriesBurned: number;
  };
  total: number;
  netCalories: number; // total - caloriesBurned
}

export interface PersonalData {
  name: string;
  birthDate: string; // ISO date string
  weight: number; // kg
  height: number; // cm
  age?: number; // calculated from birthDate
}

export interface DailyMetrics {
  date: string;
  weight?: number;
  leanMassPercentage?: number;
  fatPercentage?: number;
  leanMass?: number;
  fatMass?: number;
}

export interface AppSettings {
  dailyGoal: number;
  mealNames: {
    meal1: string;
    meal2: string;
    meal3: string;
    meal4: string;
    meal5: string;
    meal6: string;
    meal7: string;
    meal8: string;
  };
  activeMeals: number; // número de refeições ativas (5-8)
  personalData: PersonalData;
  isFirstTime: boolean; // para controlar se é primeira vez usando o app
}

export type CalorieStatus = 'under' | 'optimal' | 'over';

export interface DayData {
  date: string;
  calories: number;
  netCalories: number;
  status: CalorieStatus;
}
