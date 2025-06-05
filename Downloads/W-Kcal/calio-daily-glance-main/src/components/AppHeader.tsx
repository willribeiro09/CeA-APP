
import React from 'react';
import { Settings, Calendar as CalendarIcon, Activity, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonalData } from '@/types';

interface AppHeaderProps {
  currentView: 'calendar' | 'day' | 'settings';
  onSettingsClick: () => void;
  onHomeClick: () => void;
  onLogoutClick: () => void;
  personalData?: PersonalData;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  onSettingsClick,
  onHomeClick,
  onLogoutClick,
  personalData
}) => {
  const firstName = personalData?.name?.split(' ')[0] || '';
  
  return (
    <header className="bg-[#544DFE] border-b border-[#544DFE] sticky top-0 z-50 shadow-lg">
      {/* Safe area para PWA no iOS */}
      <div className="pt-safe-area-inset-top"></div>
      <div className="max-w-md mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <button onClick={onHomeClick} className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30 group-hover:bg-white/30 transition-all duration-200">
                <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white/50"></div>
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-white tracking-tight">W-Kcal</h1>
              <p className="text-xs text-white/80 font-medium">
                Controle Calórico
              </p>
            </div>
          </button>
          
          <div className="flex items-center gap-2">
            {currentView !== 'calendar' && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onHomeClick} 
                className="h-10 w-10 rounded-xl hover:bg-white/15 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
              >
                <CalendarIcon className="h-4 w-4" strokeWidth={2} />
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onLogoutClick} 
              className="h-10 w-10 rounded-xl hover:bg-white/15 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </Button>
            
            {currentView !== 'settings' && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onSettingsClick} 
                className="h-10 w-10 rounded-xl hover:bg-white/15 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
              >
                <Settings className="h-4 w-4" strokeWidth={2} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
