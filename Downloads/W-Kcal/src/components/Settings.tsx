
import React, { useState } from 'react';
import { Save, Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AppSettings } from '@/types';
import { saveSettings, exportData } from '@/utils/storage';

interface SettingsProps {
  settings: AppSettings;
  onSettingsUpdate: (settings: AppSettings) => void;
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onSettingsUpdate,
  onBack
}) => {
  const [formSettings, setFormSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDailyGoalChange = (value: string) => {
    const numValue = Math.max(500, parseInt(value) || 1700);
    setFormSettings(prev => ({ ...prev, dailyGoal: numValue }));
    setHasChanges(true);
  };

  const handleMealNameChange = (mealKey: keyof AppSettings['mealNames'], value: string) => {
    setFormSettings(prev => ({
      ...prev,
      mealNames: {
        ...prev.mealNames,
        [mealKey]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(formSettings);
    onSettingsUpdate(formSettings);
    setHasChanges(false);
  };

  const handleExport = () => {
    const csvData = exportData();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `calio-dados-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mealFields = [
    { key: 'meal1' as const, label: 'Primeira refeição' },
    { key: 'meal2' as const, label: 'Segunda refeição' },
    { key: 'meal3' as const, label: 'Terceira refeição' },
    { key: 'meal4' as const, label: 'Quarta refeição' },
    { key: 'meal5' as const, label: 'Quinta refeição' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        
        {hasChanges && (
          <Button
            onClick={handleSave}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-soft"
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        )}
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Configurações
        </h1>
        <p className="text-sm text-gray-600">
          Personalize sua experiência no Calio
        </p>
      </div>

      {/* Daily Goal */}
      <Card className="p-6 border border-gray-200 shadow-soft">
        <div className="space-y-4">
          <h2 className="text-base font-medium text-gray-900">Meta Diária</h2>
          <div className="space-y-2">
            <Label htmlFor="dailyGoal" className="text-sm text-gray-700">Calorias por dia</Label>
            <div className="flex items-center gap-2">
              <Input
                id="dailyGoal"
                type="number"
                min="500"
                max="5000"
                value={formSettings.dailyGoal}
                onChange={(e) => handleDailyGoalChange(e.target.value)}
                className="w-32 border-gray-200 focus:border-primary"
              />
              <span className="text-gray-500 text-sm">cal</span>
            </div>
            <p className="text-xs text-gray-500">
              Recomendado: entre 1200-2500 calorias por dia
            </p>
          </div>
        </div>
      </Card>

      {/* Meal Names */}
      <Card className="p-6 border border-gray-200 shadow-soft">
        <div className="space-y-4">
          <h2 className="text-base font-medium text-gray-900">Nomes das Refeições</h2>
          <p className="text-xs text-gray-600">
            Personalize os nomes das suas refeições
          </p>
          
          <div className="space-y-4">
            {mealFields.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-sm text-gray-700">
                  {label}
                </Label>
                <Input
                  id={key}
                  value={formSettings.mealNames[key]}
                  onChange={(e) => handleMealNameChange(key, e.target.value)}
                  placeholder={label}
                  className="border-gray-200 focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Export Data */}
      <Card className="p-6 border border-gray-200 shadow-soft">
        <div className="space-y-4">
          <h2 className="text-base font-medium text-gray-900">Exportar Dados</h2>
          <p className="text-xs text-gray-600">
            Baixe seus dados em formato CSV para backup ou análise
          </p>
          
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2 border-gray-200 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </Card>
    </div>
  );
};
