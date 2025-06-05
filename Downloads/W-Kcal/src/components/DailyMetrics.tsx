
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User, Activity, Zap, Droplets } from 'lucide-react';
import { DailyMetrics as IDailyMetrics, PersonalData } from '@/types';
import { formatDate } from '@/utils/dateUtils';

interface DailyMetricsProps {
  selectedDate: Date;
  personalData: PersonalData;
  dailyMetrics: IDailyMetrics[];
  onMetricsUpdate: (metrics: IDailyMetrics) => void;
}

export const DailyMetrics: React.FC<DailyMetricsProps> = ({
  selectedDate,
  personalData,
  dailyMetrics,
  onMetricsUpdate
}) => {
  const dateStr = formatDate(selectedDate);
  const existingMetrics = dailyMetrics.find(m => m.date === dateStr);

  const [metrics, setMetrics] = useState({
    weight: existingMetrics?.weight || 0,
    leanMassPercentage: existingMetrics?.leanMassPercentage || 0,
    fatPercentage: existingMetrics?.fatPercentage || 0
  });

  useEffect(() => {
    const existing = dailyMetrics.find(m => m.date === dateStr);
    setMetrics({
      weight: existing?.weight || 0,
      leanMassPercentage: existing?.leanMassPercentage || 0,
      fatPercentage: existing?.fatPercentage || 0
    });
  }, [selectedDate, dailyMetrics, dateStr]);

  const handleChange = (field: keyof typeof metrics, value: string) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    const newMetrics = { ...metrics, [field]: numValue };
    setMetrics(newMetrics);

    const weight = newMetrics.weight || personalData.weight;
    const leanMass = (newMetrics.leanMassPercentage / 100) * weight;
    const fatMass = (newMetrics.fatPercentage / 100) * weight;

    const dailyMetric: IDailyMetrics = {
      date: dateStr,
      weight: newMetrics.weight || undefined,
      leanMassPercentage: newMetrics.leanMassPercentage || undefined,
      fatPercentage: newMetrics.fatPercentage || undefined,
      leanMass: leanMass || undefined,
      fatMass: fatMass || undefined
    };

    onMetricsUpdate(dailyMetric);
  };

  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const firstName = personalData.name.split(' ')[0];
  const age = personalData.age || calculateAge(personalData.birthDate);

  return (
    <Card className="p-5 border border-green-200 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-200 to-emerald-200 rounded-2xl flex items-center justify-center shadow-sm">
            <User className="h-6 w-6 text-green-800" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{firstName}</h3>
            <p className="text-sm text-gray-700">{age} anos • {personalData.height}cm</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-800 mb-2 block flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Peso (kg)
            </label>
            <Input
              type="number"
              inputMode="numeric"
              step="0.1"
              value={metrics.weight || ''}
              onChange={(e) => handleChange('weight', e.target.value)}
              placeholder="0.0"
              className="text-center h-9 bg-white border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-200 rounded-lg transition-all duration-200 shadow-sm"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-800 mb-2 block flex items-center gap-1">
              <Zap className="h-3 w-3" />
              % M. Magra
            </label>
            <Input
              type="number"
              inputMode="numeric"
              step="0.1"
              max="100"
              value={metrics.leanMassPercentage || ''}
              onChange={(e) => handleChange('leanMassPercentage', e.target.value)}
              placeholder="0.0"
              className="text-center h-9 bg-white border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-200 rounded-lg transition-all duration-200 shadow-sm"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-800 mb-2 block flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              % Gordura
            </label>
            <Input
              type="number"
              inputMode="numeric"
              step="0.1"
              max="100"
              value={metrics.fatPercentage || ''}
              onChange={(e) => handleChange('fatPercentage', e.target.value)}
              placeholder="0.0"
              className="text-center h-9 bg-white border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-200 rounded-lg transition-all duration-200 shadow-sm"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
