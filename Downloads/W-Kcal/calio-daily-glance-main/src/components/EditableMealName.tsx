
import React, { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditableMealNameProps {
  mealName: string;
  onSave: (newName: string) => void;
}

export const EditableMealName: React.FC<EditableMealNameProps> = ({
  mealName,
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(mealName);

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(mealName);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          className="h-8 text-sm font-medium"
          autoFocus
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-green-600 hover:bg-green-50"
          onClick={handleSave}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-gray-400 hover:bg-gray-50"
          onClick={handleCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-gray-900">{mealName}</span>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
};
