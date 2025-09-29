import React, { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

export type ClientType = 'Power' | 'Private';

interface ClientSelectorProps {
  selectedClient: ClientType;
  onClientChange: (client: ClientType) => void;
}

export function ClientSelector({ selectedClient, onClientChange }: ClientSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const handleClientSelect = useCallback((client: ClientType) => {
    onClientChange(client);
    setIsDropdownOpen(false);
  }, [onClientChange]);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen]);

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-1"
      >
        <span className="text-gray-700 font-medium text-sm">Client:</span>
        <div className="flex items-center px-2 py-1 bg-gradient-to-r from-white to-[#f9fcf7] border border-[#e0f0d8] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
          <span className="text-[#5ABB37] font-medium text-sm">
            {selectedClient}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#5ABB37] ml-1 transition-transform ${
              isDropdownOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>
      
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-40 min-w-[120px]">
          <button
            onClick={() => handleClientSelect('Private')}
            className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
              selectedClient === 'Private' ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
            }`}
          >
            <span className="font-medium text-sm">Private</span>
          </button>
          <button
            onClick={() => handleClientSelect('Power')}
            className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
              selectedClient === 'Power' ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
            }`}
          >
            <span className="font-medium text-sm">Power</span>
          </button>
        </div>
      )}
    </div>
  );
}
