import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Obter credenciais do Firebase Admin
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'FIREBASE_SERVICE_ACCOUNT não configurado',
          message: 'Configure a secret FIREBASE_SERVICE_ACCOUNT no Supabase Dashboard',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Obter access token do Google OAuth2
    const jwtHeader = btoa(
      JSON.stringify({
        alg: 'RS256',
        typ: 'JWT',
      })
    );

    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const signatureInput = jwtHeader + '.' + jwtClaimSetEncoded;

    // Importar chave privada
    const privateKey = serviceAccount.private_key;
    const pemContents = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\n/g, '');

    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = signatureInput + '.' + signatureEncoded;

    // Obter access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Falha ao obter access token: ' + JSON.stringify(tokenData));
    }

    const accessToken = tokenData.access_token;

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Receber dados da requisição
    const { title, body, data, deviceId } = await req.json();

    console.log('📧 Enviando notificação:', { title, body, data, deviceId });

    // Buscar tokens FCM
    let tokenQuery = supabase.from('device_tokens').select('fcm_token, device_id');

    if (deviceId) {
      tokenQuery = tokenQuery.eq('device_id', deviceId);
    }

    const { data: tokens, error: tokenError } = await tokenQuery;

    if (tokenError) {
      throw new Error(`Erro ao buscar tokens: ${tokenError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      throw new Error('Nenhum token FCM encontrado');
    }

    console.log(`✅ Encontrados ${tokens.length} dispositivo(s)`);

    // Enviar notificações usando Firebase Cloud Messaging API v1
    const results = [];
    const projectId = serviceAccount.project_id;

    for (const tokenData of tokens) {
      const fcmToken = tokenData.fcm_token;

      // Gerar tag única para evitar notificações duplicadas
      // O navegador substitui notificações com a mesma tag
      const timestamp = Date.now();
      const notificationTag = data?.tag || `gp-${timestamp}-${tokenData.device_id || 'unknown'}`;

      const message = {
        message: {
          token: fcmToken,
          // NÃO enviar campo "notification" - isso evita notificação automática do Firebase
          // Enviar SOMENTE "data" para controle total no Service Worker
          webpush: {
            fcm_options: {
              link: '/',
            },
          },
          data: {
            ...(data || {}),
            // Campos para o Service Worker montar a notificação
            title: title || 'Gutter Pros LLC',
            body: body || 'You have a new notification',
            icon: '/gp-icon-512.png',
            tag: notificationTag,
            timestamp: new Date().toISOString(),
          },
        },
      };

      console.log(`📤 Enviando para: ${tokenData.device_id}`);

      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(message),
        }
      );

      const result = await fcmResponse.json();

      if (fcmResponse.ok) {
        console.log('✅ Notificação push enviada:', result);

        // Salvar notificação no banco de dados para o dropdown
        try {
          const { error: insertError } = await supabase.from('notifications').insert({
            device_id: tokenData.device_id,
            title: title || 'Gutter Pros LLC',
            body: body || 'You have a new notification',
            data: data || {},
            is_read: false,
            created_at: new Date().toISOString(),
          });

          if (insertError) {
            console.error('❌ Erro ao salvar notificação no banco:', insertError);
          } else {
            console.log('✅ Notificação salva no banco de dados');
          }
        } catch (dbError) {
          console.error('❌ Erro ao salvar no banco:', dbError);
        }
      } else {
        console.error('❌ Erro do Firebase:', result);
      }

      results.push({
        device_id: tokenData.device_id,
        success: fcmResponse.ok,
        result,
      });
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificação enviada para ${successCount}/${tokens.length} dispositivo(s)`,
        results,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});







