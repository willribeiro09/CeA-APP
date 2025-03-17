import React from 'react';

/**
 * HOC para facilitar a memoização de componentes
 * @param Component Componente a ser memoizado
 * @param propsAreEqual Função opcional para comparação personalizada de props
 * @returns Componente memoizado
 */
export function withMemo<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> {
  const MemoizedComponent = React.memo(Component, propsAreEqual);
  
  // Define um nome de exibição para facilitar a depuração
  MemoizedComponent.displayName = displayName || `Memo(${Component.displayName || Component.name || 'Component'})`;
  
  return MemoizedComponent;
}

/**
 * Verifica se duas arrays são iguais (comparação superficial)
 */
export function areArraysEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

/**
 * Verifica se dois objetos são iguais (comparação superficial)
 */
export function areObjectsEqual<T extends Record<string, any>>(a: T, b: T): boolean {
  if (a === b) return true;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  
  return true;
} 