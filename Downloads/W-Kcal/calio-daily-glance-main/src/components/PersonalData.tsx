
import React, { useState } from 'react';
import { User, Scale, Ruler, Calculator } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PersonalData as PersonalDataType } from '@/types';

interface PersonalDataProps {
  personalData: PersonalDataType;
  onUpdate: (data: PersonalDataType) => void;
}

export const PersonalData: React.FC<PersonalDataProps> = ({
  personalData,
  onUpdate
}) => {
  const [data, setData] = useState(personalData);

  const calculateBMI = () => {
    if (data.weight > 0 && data.height > 0) {
      const heightInMeters = data.height / 100;
      return (data.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return '0.0';
  };

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Abaixo do peso', color: 'text-blue-600' };
    if (bmi < 25) return { text: 'Peso normal', color: 'text-green-600' };
    if (bmi < 30) return { text: 'Sobrepeso', color: 'text-orange-600' };
    return { text: 'Obesidade', color: 'text-red-600' };
  };

  const handleChange = (field: keyof PersonalDataType, value: string | number) => {
    const updatedData = { ...data, [field]: value };
    setData(updatedData);
    onUpdate(updatedData);
  };

  const bmi = parseFloat(calculateBMI());
  const bmiStatus = getBMIStatus(bmi);

  return (
    <Card className="p-6 border border-gray-200 shadow-soft">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900">Dados Pessoais</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nome</Label>
            <Input
              id="name"
              type="text"
              value={data.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Seu nome"
              className="mt-1 bg-white border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="age" className="text-sm font-medium text-gray-700">Idade</Label>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                min="0"
                value={data.age || ''}
                onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                placeholder="Anos"
                className="mt-1 bg-white border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
            
            <div>
              <Label htmlFor="weight" className="text-sm font-medium text-gray-700">Peso (kg)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Scale className="h-4 w-4 text-gray-400" />
                <Input
                  id="weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={data.weight || ''}
                  onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                  className="bg-white border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="height" className="text-sm font-medium text-gray-700">Altura (cm)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Ruler className="h-4 w-4 text-gray-400" />
                <Input
                  id="height"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={data.height || ''}
                  onChange={(e) => handleChange('height', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-white border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">IMC</Label>
              <div className="flex items-center gap-2 mt-1">
                <Calculator className="h-4 w-4 text-gray-400" />
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                  <div className="text-lg font-semibold text-gray-900">{calculateBMI()}</div>
                  <div className={`text-xs ${bmiStatus.color}`}>{bmiStatus.text}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
