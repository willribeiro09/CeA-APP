
import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/Calendar';
import { DayView } from '@/components/DayView';
import { Settings } from '@/components/Settings';
import { AppHeader } from '@/components/AppHeader';
import { Dashboard } from '@/components/Dashboard';
import { EvolutionChart } from '@/components/EvolutionChart';
import { CalorieEntry, AppSettings, DailyMetrics } from '@/types';
import { getCalorieEntries, getSettings, saveSettings, getDailyMetrics, saveDailyMetric } from '@/utils/storage';
import { formatDate } from '@/utils/dateUtils';
import { useStatusBar } from '@/hooks/useStatusBar';
import Welcome from './Welcome';

type ViewType = 'calendar' | 'day' | 'settings';

const Index = () => {
  // Configurar status bar do iOS
  useStatusBar();

  const [currentView, setCurrentView] = useState<ViewType>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<CalorieEntry[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
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
  });

  useEffect(() => {
    // Load data on mount
    setEntries(getCalorieEntries());
    setDailyMetrics(getDailyMetrics());
    setSettings(getSettings());
  }, []);

  const handleWelcomeComplete = (personalData: any) => {
    const updatedSettings = {
      ...settings,
      personalData,
      isFirstTime: false
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentView('day');
  };

  const handleBackToCalendar = () => {
    setCurrentView('calendar');
  };

  const handleSettingsClick = () => {
    setCurrentView('settings');
  };

  const handleLogout = () => {
    // Resetar para primeira vez para voltar à tela de boas-vindas
    const resetSettings = {
      ...settings,
      isFirstTime: true
    };
    setSettings(resetSettings);
    saveSettings(resetSettings);
  };

  const handleEntryUpdate = (updatedEntry: CalorieEntry) => {
    setEntries(prev => {
      const newEntries = [...prev];
      const index = newEntries.findIndex(e => e.date === updatedEntry.date);
      if (index >= 0) {
        newEntries[index] = updatedEntry;
      } else {
        newEntries.push(updatedEntry);
      }
      return newEntries;
    });
  };

  const handleSettingsUpdate = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleMetricsUpdate = (metrics: DailyMetrics) => {
    setDailyMetrics(prev => {
      const newMetrics = [...prev];
      const index = newMetrics.findIndex(m => m.date === metrics.date);
      if (index >= 0) {
        newMetrics[index] = metrics;
      } else {
        newMetrics.push(metrics);
      }
      saveDailyMetric(metrics);
      return newMetrics;
    });
  };

  const currentEntry = entries.find(entry => entry.date === formatDate(selectedDate));
  const firstName = settings.personalData?.name?.split(' ')[0] || '';

  // Show Welcome screen if first time
  if (settings.isFirstTime || !settings.personalData.name) {
    return <Welcome onComplete={handleWelcomeComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#544DFE]">
      <AppHeader
        currentView={currentView}
        onSettingsClick={handleSettingsClick}
        onHomeClick={handleBackToCalendar}
        onLogoutClick={handleLogout}
        personalData={settings.personalData}
      />
      
      <main className="max-w-md mx-auto px-4 py-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        {currentView === 'calendar' && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-soft border-0">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Olá {firstName}
                </h2>
                <p className="text-gray-600">
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
            </div>
            
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              entries={entries}
              dailyGoal={settings.dailyGoal}
            />
            
            <EvolutionChart dailyMetrics={dailyMetrics} />
            
            <Dashboard
              entries={entries}
              dailyMetrics={dailyMetrics}
              personalData={settings.personalData}
              dailyGoal={settings.dailyGoal}
            />
          </>
        )}
        
        {currentView === 'day' && (
          <DayView
            selectedDate={selectedDate}
            onBack={handleBackToCalendar}
            entry={currentEntry}
            settings={settings}
            onEntryUpdate={handleEntryUpdate}
            dailyMetrics={dailyMetrics}
            onMetricsUpdate={handleMetricsUpdate}
          />
        )}
        
        {currentView === 'settings' && (
          <Settings
            settings={settings}
            onSettingsUpdate={handleSettingsUpdate}
            onBack={handleBackToCalendar}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
