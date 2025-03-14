declare module '@radix-ui/react-dialog' {
  import * as React from 'react';

  /* Tipos básicos */
  type PrimitiveProps = React.ComponentPropsWithoutRef<'div'>;
  type DialogProps = {
    children?: React.ReactNode;
  };

  /* Root */
  interface RootProps extends DialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
    modal?: boolean;
  }
  export const Root: React.FC<RootProps>;

  /* Trigger */
  interface TriggerProps extends React.ComponentPropsWithoutRef<'button'> {
    asChild?: boolean;
  }
  export const Trigger: React.FC<TriggerProps>;

  /* Portal */
  interface PortalProps {
    children?: React.ReactNode;
    container?: HTMLElement;
    forceMount?: boolean;
  }
  export const Portal: React.FC<PortalProps>;

  /* Overlay */
  interface OverlayProps extends React.ComponentPropsWithoutRef<'div'> {
    asChild?: boolean;
    forceMount?: boolean;
  }
  export const Overlay: React.FC<OverlayProps>;

  /* Content */
  interface ContentProps extends React.ComponentPropsWithoutRef<'div'> {
    asChild?: boolean;
    forceMount?: boolean;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    onPointerDownOutside?: (event: PointerEvent) => void;
    onInteractOutside?: (event: PointerEvent) => void;
    onOpenAutoFocus?: (event: React.FocusEvent) => void;
    onCloseAutoFocus?: (event: React.FocusEvent) => void;
  }
  export const Content: React.FC<ContentProps>;

  /* Close */
  interface CloseProps extends React.ComponentPropsWithoutRef<'button'> {
    asChild?: boolean;
  }
  export const Close: React.FC<CloseProps>;

  /* Title */
  interface TitleProps extends React.ComponentPropsWithoutRef<'h2'> {
    asChild?: boolean;
  }
  export const Title: React.FC<TitleProps>;

  /* Description */
  interface DescriptionProps extends React.ComponentPropsWithoutRef<'p'> {
    asChild?: boolean;
  }
  export const Description: React.FC<DescriptionProps>;
} 