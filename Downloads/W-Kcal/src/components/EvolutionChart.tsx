
import React from 'react';
import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { DailyMetrics } from '@/types';

interface EvolutionChartProps {
  dailyMetrics: DailyMetrics[];
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({ dailyMetrics }) => {
  // Pegar os últimos 7 dias com dados
  const chartData = dailyMetrics
    .filter(metric => metric.weight || metric.fatPercentage || metric.leanMassPercentage)
    .slice(-7)
    .map(metric => ({
      date: new Date(metric.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: metric.weight || null,
      gordura: metric.fatPercentage || null,
      massaMagra: metric.leanMassPercentage || null
    }));

  const chartConfig = {
    peso: {
      label: "Peso (kg)",
      color: "#3b82f6"
    },
    gordura: {
      label: "% Gordura",
      color: "#ef4444"
    },
    massaMagra: {
      label: "% Massa Magra", 
      color: "#22c55e"
    }
  };

  if (chartData.length === 0) {
    return (
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Evolução Diária</h3>
        <p className="text-gray-600 text-sm">Adicione dados diários para ver o gráfico de evolução</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Evolução Diária</h3>
      
      <ChartContainer config={chartConfig} className="h-48">
        <LineChart data={chartData}>
          <XAxis dataKey="date" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line 
            type="monotone" 
            dataKey="peso" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="gordura" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: "#ef4444", r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="massaMagra" 
            stroke="#22c55e" 
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 4 }}
          />
        </LineChart>
      </ChartContainer>
    </Card>
  );
};
