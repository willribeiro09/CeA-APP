import React from 'react';

// Importar o Dialog com o comentário para ignorar erros de tipo
// @ts-ignore
import * as Dialog from '@radix-ui/react-dialog';

// Interfaces para os componentes do Dialog
interface DialogRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onOpenAutoFocus?: (event: React.FocusEvent) => void;
  onCloseAutoFocus?: (event: React.FocusEvent) => void;
}

interface DialogCloseProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

// Componentes wrapper
export const DialogRoot: React.FC<DialogRootProps> = ({ open, onOpenChange, children }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog.Root>
  );
};

export const DialogTrigger: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  return <Dialog.Trigger className={className}>{children}</Dialog.Trigger>;
};

export const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Dialog.Portal>{children}</Dialog.Portal>;
};

export const DialogOverlay: React.FC<{ className?: string }> = ({ className }) => {
  return <Dialog.Overlay className={className} />;
};

export const DialogContent: React.FC<DialogContentProps> = ({ 
  children, 
  className,
  onOpenAutoFocus,
  onCloseAutoFocus
}) => {
  return (
    <Dialog.Content 
      className={className}
      onOpenAutoFocus={onOpenAutoFocus}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {children}
    </Dialog.Content>
  );
};

export const DialogClose: React.FC<DialogCloseProps> = ({ children, className, onClick }) => {
  return (
    <Dialog.Close className={className} onClick={onClick}>
      {children}
    </Dialog.Close>
  );
};

export const DialogTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  return <Dialog.Title className={className}>{children}</Dialog.Title>;
};

export const DialogDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  return <Dialog.Description className={className}>{children}</Dialog.Description>;
}; 