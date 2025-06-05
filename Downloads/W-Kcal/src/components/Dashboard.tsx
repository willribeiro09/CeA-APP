
import React from 'react';
import { Card } from '@/components/ui/card';
import { User, Activity, Zap, Droplets } from 'lucide-react';
import { CalorieEntry, DailyMetrics, PersonalData } from '@/types';

interface DashboardProps {
  entries: CalorieEntry[];
  dailyMetrics: DailyMetrics[];
  personalData: PersonalData;
  dailyGoal: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  dailyMetrics,
  personalData
}) => {
  // Pegar os dados mais recentes
  const recentMetrics = dailyMetrics.length > 0 
    ? dailyMetrics[dailyMetrics.length - 1]
    : null;

  const currentWeight = recentMetrics?.weight || personalData.weight;

  const calculateBMI = (weight: number, height: number) => {
    return (weight / ((height / 100) ** 2)).toFixed(1);
  };

  const currentBMI = calculateBMI(currentWeight, personalData.height);

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { status: 'Abaixo do peso', color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100' };
    if (bmi < 25) return { status: 'Peso normal', color: 'text-green-600', bg: 'bg-green-50', iconBg: 'bg-green-100' };
    if (bmi < 30) return { status: 'Sobrepeso', color: 'text-orange-600', bg: 'bg-orange-50', iconBg: 'bg-orange-100' };
    return { status: 'Obesidade', color: 'text-red-600', bg: 'bg-red-50', iconBg: 'bg-red-100' };
  };

  const bmiStatus = getBMIStatus(parseFloat(currentBMI));

  const dashboardItems = [
    {
      title: 'IMC',
      value: currentBMI,
      subtitle: bmiStatus.status,
      icon: User,
      color: bmiStatus.color,
      bg: bmiStatus.bg,
      iconBg: bmiStatus.iconBg
    },
    {
      title: 'Peso',
      value: `${currentWeight.toFixed(1)}kg`,
      subtitle: 'Atual',
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100'
    },
    {
      title: '% Gordura',
      value: recentMetrics?.fatPercentage ? `${recentMetrics.fatPercentage.toFixed(1)}%` : '--',
      subtitle: 'Corporal',
      icon: Droplets,
      color: 'text-red-600',
      bg: 'bg-red-50',
      iconBg: 'bg-red-100'
    },
    {
      title: '% Massa Magra',
      value: recentMetrics?.leanMassPercentage ? `${recentMetrics.leanMassPercentage.toFixed(1)}%` : '--',
      subtitle: 'Atual',
      icon: Zap,
      color: 'text-green-600',
      bg: 'bg-green-50',
      iconBg: 'bg-green-100'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {dashboardItems.map((item, index) => (
          <Card key={index} className={`p-4 ${item.bg} shadow-sm rounded-2xl border-0`}>
            <div className="flex flex-col space-y-3">
              {/* Primeira linha: Ícone e título */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${item.iconBg} rounded-xl flex items-center justify-center`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={2.5} />
                </div>
                <span className="text-sm font-semibold text-gray-700">{item.title}</span>
              </div>
              
              {/* Segunda linha: Valor principal */}
              <div className={`text-2xl font-bold ${item.color} leading-tight`}>
                {item.value}
              </div>
              
              {/* Terceira linha: Informativo */}
              <div className="text-xs text-gray-600 font-medium">
                {item.subtitle}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
