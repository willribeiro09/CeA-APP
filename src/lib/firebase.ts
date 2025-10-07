import { initializeApp } from 'firebase/app';
import { getMessaging, Messaging } from 'firebase/messaging';

// Configuração do Firebase obtida do Console
const firebaseConfig = {
  apiKey: "AIzaSyD-kvKLT9VaowZetAjePs_D4OyOWmHEkvY",
  authDomain: "cea-gutters-app-b8a3d.firebaseapp.com",
  projectId: "cea-gutters-app-b8a3d",
  storageBucket: "cea-gutters-app-b8a3d.firebasestorage.app",
  messagingSenderId: "1023177835021",
  appId: "1:1023177835021:web:e68a57b9606b917ffc4b44"
};

// Chave VAPID para Web Push
export const VAPID_KEY = "BNp4vradnaMygeP3hTIT5z27FUE7AVVFC5FBB6vsv986-Ow4ldU5GMLRtnRlmbtdOVh64ngXJqc-FJoN3kIlAa0";

// Inicializar Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Função para obter o messaging com segurança (só funciona em contexto compatível)
export const getFirebaseMessaging = (): Messaging | null => {
  try {
    // Verifica se está em um contexto onde messaging é suportado
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      return getMessaging(firebaseApp);
    }
    return null;
  } catch (error) {
    console.error('Erro ao inicializar Firebase Messaging:', error);
    return null;
  }
};

