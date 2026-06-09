import { Component, ErrorInfo, ReactNode } from 'react';

/**
 * ErrorBoundary ("disjuntor")
 *
 * Funciona como o disjuntor de uma casa: se algum componente da tela quebrar
 * com um erro inesperado, em vez de derrubar o aplicativo inteiro (tela branca),
 * este componente captura o erro e mostra uma tela amigável com a opção de
 * recarregar. O resto do app não é afetado.
 *
 * Importante: ele NÃO altera nenhuma lógica existente. É apenas uma proteção
 * adicionada por cima. Captura erros de renderização (a maioria das "panes").
 *
 * Os estilos são inline de propósito: assim a tela de erro funciona mesmo que
 * o CSS do app não tenha carregado.
 */

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Quando um erro acontece, marca o estado para mostrar a tela de fallback.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Mantém o erro visível no console para facilitar o diagnóstico.
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            color: '#1e293b',
            fontFamily:
              "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }} role="img" aria-label="aviso">
            ⚠️
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
            Algo deu errado
          </h1>

          <p style={{ fontSize: '15px', maxWidth: '320px', margin: '0 0 24px', color: '#475569' }}>
            O aplicativo encontrou um problema inesperado. Seus dados estão salvos. Toque no botão
            abaixo para recarregar.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            Recarregar o aplicativo
          </button>

          {this.state.error?.message && (
            <details style={{ marginTop: '24px', maxWidth: '320px' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#94a3b8',
                }}
              >
                Detalhes técnicos
              </summary>
              <pre
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#64748b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  textAlign: 'left',
                }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
