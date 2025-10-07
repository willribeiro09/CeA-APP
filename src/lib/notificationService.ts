import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { getFirebaseMessaging, VAPID_KEY } from './firebase';
import { supabase } from './supabase';
import { getDeviceId } from './deviceUtils';

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

/**
 * Verifica o status atual da permissão de notificações
 */
export const checkNotificationPermission = (): NotificationPermissionStatus => {
  if (!('Notification' in window)) {
    return { granted: false, denied: true, default: false };
  }

  return {
    granted: Notification.permission === 'granted',
    denied: Notification.permission === 'denied',
    default: Notification.permission === 'default'
  };
};

/**
 * Solicita permissão do usuário para receber notificações
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Permissão de notificações negada pelo usuário');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão:', error);
    return false;
  }
};

/**
 * Obtém o token FCM do dispositivo atual
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.error('Firebase Messaging não disponível');
      return null;
    }

    // Verifica se tem permissão
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return null;
    }

    // Obtém o token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      console.log('Token FCM obtido:', token);
      return token;
    } else {
      console.warn('Não foi possível obter o token FCM');
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter token FCM:', error);
    return null;
  }
};

/**
 * Salva o token FCM no Supabase vinculado ao dispositivo
 */
export const saveFCMTokenToDatabase = async (token: string): Promise<boolean> => {
  try {
    const deviceId = getDeviceId();
    
    // Salvar também no localStorage como backup
    localStorage.setItem('cea_fcm_token', token);
    console.log('✅ Token FCM salvo localmente:', token);
    
    // Verifica se já existe um registro para este dispositivo
    const { data: existing, error: selectError } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (selectError) {
      console.error('Erro ao verificar token existente:', selectError);
      // Continua mesmo com erro - localStorage é o backup
    }

    if (existing) {
      // Atualiza o token existente
      const { error } = await supabase
        .from('device_tokens')
        .update({
          fcm_token: token,
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId);

      if (error) {
        console.error('Erro ao atualizar token:', error);
        throw error;
      }
      console.log('✅ Token FCM atualizado no banco de dados');
    } else {
      // Cria novo registro
      const { error } = await supabase
        .from('device_tokens')
        .insert({
          device_id: deviceId,
          fcm_token: token,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao inserir token:', error);
        throw error;
      }
      console.log('✅ Token FCM criado no banco de dados');
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar token no banco:', error);
    // Retorna true mesmo com erro pois localStorage tem o backup
    return true;
  }
};

/**
 * Inicializa o sistema de notificações
 * Solicita permissão, obtém token e salva no banco
 */
export const initializeNotifications = async (): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> => {
  try {
    // Verifica suporte
    if (!('Notification' in window)) {
      return {
        success: false,
        error: 'Navegador não suporta notificações'
      };
    }

    if (!('serviceWorker' in navigator)) {
      return {
        success: false,
        error: 'Navegador não suporta Service Workers'
      };
    }

    // Obtém o token
    const token = await getFCMToken();
    if (!token) {
      return {
        success: false,
        error: 'Não foi possível obter o token de notificação'
      };
    }

    // Salva no banco
    const saved = await saveFCMTokenToDatabase(token);
    if (!saved) {
      return {
        success: false,
        token,
        error: 'Token obtido mas não foi possível salvar no banco'
      };
    }

    return {
      success: true,
      token
    };
  } catch (error) {
    console.error('Erro ao inicializar notificações:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

/**
 * Configura listener para notificações recebidas quando o app está aberto (foreground)
 */
export const setupForegroundNotificationListener = (
  onNotificationReceived?: (payload: MessagePayload) => void
) => {
  const messaging = getFirebaseMessaging();
  if (!messaging) {
    console.error('Firebase Messaging não disponível');
    return;
  }

  onMessage(messaging, (payload) => {
    console.log('Notificação recebida (foreground):', payload);

    // Callback customizado
    if (onNotificationReceived) {
      onNotificationReceived(payload);
    }

    // Mostra notificação nativa se tiver permissão
    if (Notification.permission === 'granted' && payload.notification) {
      const { title, body, icon } = payload.notification;
      
      new Notification(title || 'CeA APP', {
        body: body || '',
        icon: icon || '/cealogo.png',
        data: payload.data
      });
    }
  });
};

/**
 * Mostra uma notificação de teste
 */
export const showTestNotification = async () => {
  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) {
      alert('Permissão de notificações necessária');
      return;
    }
  }

  new Notification('CeA APP - Teste', {
    body: 'Sistema de notificações funcionando!',
    icon: '/cealogo.png',
    badge: '/cealogo.png'
  });
};

