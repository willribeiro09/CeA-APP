
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Activity, Calendar, Ruler, Weight } from 'lucide-react';
import { PersonalData } from '@/types';
import { getSettings } from '@/utils/storage';

interface WelcomeProps {
  onComplete: (personalData: PersonalData) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    height: '',
    weight: ''
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.birthDate || !formData.height || !formData.weight) {
      return;
    }

    // Verificar se já existe um usuário com o mesmo nome e data de nascimento
    const existingSettings = getSettings();
    const existingPersonalData = existingSettings.personalData;
    
    if (existingPersonalData && 
        existingPersonalData.name === formData.name && 
        existingPersonalData.birthDate === formData.birthDate) {
      // Usuário existente encontrado, usar dados existentes
      onComplete(existingPersonalData);
      return;
    }

    // Novo usuário
    const personalData: PersonalData = {
      name: formData.name,
      birthDate: formData.birthDate,
      height: parseFloat(formData.height),
      weight: parseFloat(formData.weight),
      age: calculateAge(formData.birthDate)
    };

    onComplete(personalData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormValid = formData.name && formData.birthDate && formData.height && formData.weight;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#544DFE] via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl border-0">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#544DFE] to-purple-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg relative">
            <Activity className="h-10 w-10 text-white" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo ao W-Kcal</h1>
          <p className="text-gray-600">Vamos configurar seu perfil para começar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#544DFE]" />
              Nome completo
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Seu nome"
              className="h-12 bg-white border-gray-200 focus:border-[#544DFE] focus:ring-2 focus:ring-purple-200 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#544DFE]" />
              Data de nascimento
            </label>
            <Input
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              className="h-12 bg-white border-gray-200 focus:border-[#544DFE] focus:ring-2 focus:ring-purple-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Ruler className="h-4 w-4 text-[#544DFE]" />
                Altura (cm)
              </label>
              <Input
                type="number"
                inputMode="numeric"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="170"
                className="h-12 bg-white border-gray-200 focus:border-[#544DFE] focus:ring-2 focus:ring-purple-200 rounded-xl text-center"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Weight className="h-4 w-4 text-[#544DFE]" />
                Peso (kg)
              </label>
              <Input
                type="number"
                inputMode="numeric"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder="70.0"
                className="h-12 bg-white border-gray-200 focus:border-[#544DFE] focus:ring-2 focus:ring-purple-200 rounded-xl text-center"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid}
            className="w-full h-12 bg-gradient-to-r from-[#544DFE] to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-medium text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {formData.name && formData.birthDate ? 'Entrar' : 'Começar'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Welcome;
