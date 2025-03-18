// Service Worker para bloquear requisições indesejadas

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker instalado');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  return self.clients.claim();
});

// Interceptar requisições de rede
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Bloquear chamadas para webtest.net
  if (url.hostname.includes('webtest.net')) {
    console.log('Bloqueando requisição para:', url.href);
    
    // Criar uma resposta com os cabeçalhos CORS adequados
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    });
    
    // Se for uma requisição OPTIONS (preflight), responder com os cabeçalhos CORS
    if (event.request.method === 'OPTIONS') {
      event.respondWith(new Response(null, { 
        status: 204, 
        headers: headers 
      }));
      return;
    }
    
    // Para outras requisições, responder com um JSON vazio
    event.respondWith(new Response(JSON.stringify({ status: 'blocked' }), { 
      status: 200, 
      headers: headers 
    }));
    return;
  }
  
  // Permitir todas as outras requisições
  event.respondWith(fetch(event.request));
}); 