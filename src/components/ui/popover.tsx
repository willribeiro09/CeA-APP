import * as React from 'react';
import { cn } from '../../lib/utils';

// Implementação simplificada de Popover sem depender de @radix-ui/react-popover
interface PopoverProps {
  children: React.ReactNode;
}

const PopoverContext = React.createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  open: false,
  setOpen: () => {},
});

const Popover: React.FC<PopoverProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
};

interface PopoverTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

const PopoverTrigger: React.FC<PopoverTriggerProps> = ({ children, asChild }) => {
  const { open, setOpen } = React.useContext(PopoverContext);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(!open);
  };
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    } as React.HTMLAttributes<HTMLElement>);
  }
  
  return (
    <button onClick={handleClick}>
      {children}
    </button>
  );
};

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'center' | 'start' | 'end';
  sideOffset?: number;
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', sideOffset = 4, ...props }, ref) => {
    const { open } = React.useContext(PopoverContext);
    
    if (!open) return null;
    
    return (
      <div
        ref={ref}
        className={cn(
          'absolute z-50 min-w-[8rem] rounded-md border bg-white p-4 shadow-md outline-none',
          align === 'center' && 'left-1/2 transform -translate-x-1/2',
          align === 'start' && 'left-0',
          align === 'end' && 'right-0',
          'top-full mt-2',
          className
        )}
        {...props}
      />
    );
  }
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent }; 