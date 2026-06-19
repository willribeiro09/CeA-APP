import { useEffect, useState } from 'react';
import { isIOSDevice } from '../lib/deviceUtils';

/**
 * PAINEL DE DIAGNÓSTICO TEMPORÁRIO (somente iOS).
 *
 * Mostra na própria tela do iPhone o estado das notificações e oferece um
 * botão que chama Notification.requestPermission() de forma DIRETA (sem
 * Firebase e sem nenhum guard), igual a um app que funciona.
 *
 * Objetivo: descobrir onde o fluxo trava. REMOVER depois do diagnóstico.
 */
export function NotificationDebug() {
  const [state, setState] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>('');

  const refresh = () => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setState({
      iOS: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'sim' : 'nao',
      'navigator.standalone': String(nav.standalone),
      'display-mode standalone': window.matchMedia('(display-mode: standalone)').matches
        ? 'sim'
        : 'nao',
      "Notification existe": 'Notification' in window ? 'sim' : 'NAO',
      'permission atual': 'Notification' in window ? Notification.permission : 'N/A',
      serviceWorker: 'serviceWorker' in navigator ? 'sim' : 'nao',
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const pedirDireto = async () => {
    try {
      if (!('Notification' in window)) {
        setResult('ERRO: "Notification" não existe neste contexto (não é PWA instalado / iOS < 16.4)');
        return;
      }
      setResult('chamando requestPermission...');
      const p = await Notification.requestPermission();
      setResult('Resultado: ' + p);
      refresh();
    } catch (e) {
      setResult('EXCEÇÃO: ' + (e as Error).message);
    }
  };

  // Só aparece no iPhone/iPad — Android e desktop não veem nada.
  if (!isIOSDevice()) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        left: 8,
        right: 8,
        zIndex: 99999,
        background: '#fffbe6',
        border: '2px solid #f59e0b',
        borderRadius: 10,
        padding: 12,
        fontSize: 12,
        lineHeight: 1.5,
        color: '#111',
        fontFamily: 'monospace',
        boxShadow: '0 4px 12px rgba(0,0,0,.25)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>🔧 DEBUG NOTIFICAÇÕES (temporário)</div>
      {Object.entries(state).map(([k, v]) => (
        <div key={k}>
          {k}: <b>{v}</b>
        </div>
      ))}
      <button
        onClick={pedirDireto}
        style={{
          marginTop: 10,
          width: '100%',
          padding: '12px',
          background: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        Pedir permissão agora (direto)
      </button>
      {result && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: '#fff',
            borderRadius: 6,
            fontWeight: 700,
            wordBreak: 'break-word',
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}

export default NotificationDebug;
