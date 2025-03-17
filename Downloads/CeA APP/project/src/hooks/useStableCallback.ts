import { useCallback, useRef } from 'react';

/**
 * Hook que cria um callback estável que não muda entre renderizações,
 * mas sempre usa a versão mais recente da função fornecida.
 * 
 * Útil para evitar re-renderizações desnecessárias em componentes filhos
 * quando callbacks são passados como props.
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  
  // Atualiza a referência para a versão mais recente da função
  callbackRef.current = callback;
  
  // Retorna um callback estável que não muda entre renderizações
  return useCallback(
    ((...args: any[]) => {
      return callbackRef.current(...args);
    }) as T,
    []
  );
}

/**
 * Hook que cria uma versão memoizada de um valor que só muda
 * quando a comparação personalizada indica uma mudança.
 */
export function useDeepMemo<T>(value: T, isEqual: (prev: T, next: T) => boolean): T {
  const ref = useRef<T>(value);
  
  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }
  
  return ref.current;
} 