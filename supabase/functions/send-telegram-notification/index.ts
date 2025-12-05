import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

interface RequestData {
  type: 'invoice' | 'estimate';
  customer_name: string;
  customer_phone: string;
  address: string;
  work_items: Array<{
    workType: string;
    color: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  total_value: number;
  status: string;
  created_at: string;
  send_from?: string[]; // Array com os nomes selecionados
  isEdit?: boolean;
}

interface AppOpenedData {
  type: 'app_opened';
  timestamp: string;
  platform?: string;
  browser?: string;
  screenSize?: string;
  language?: string;
  userAgent?: string;
}

function formatRequestMessage(data: RequestData): string {
  const typeLabel = data.type === 'invoice' ? '📄 Invoice' : '📋 Estimate';
  const date = new Date(data.created_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  let workItemsText = '';
  if (data.work_items && data.work_items.length > 0) {
    workItemsText = data.work_items.map((item, index) => 
      `  ${index + 1}. ${item.workType} - ${item.color}\n     Qty: ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.total.toFixed(2)}`
    ).join('\n');
  }

  // Formatar send_from
  let sendFromText = '';
  if (data.send_from && Array.isArray(data.send_from) && data.send_from.length > 0) {
    sendFromText = `\n*Send PDF to:* ${data.send_from.join(', ')}`;
  }

  const isEdit = data.isEdit === true;
  const header = isEdit ? '✏️ *Request Updated*'
                        : '🔔 *New Request Received*';

  return `${header}\n\n` +
    `*Type:* ${typeLabel}\n` +
    `*Customer:* ${data.customer_name}\n` +
    `*Phone:* ${data.customer_phone}\n` +
    `*Address:* ${data.address}${sendFromText}\n` +
    `*Date:* ${date}\n` +
    `*Status:* ${data.status}\n\n` +
    `*Work Items:*\n${workItemsText}\n\n` +
    `💰 *Total Value:* $${data.total_value.toFixed(2)}`;
}

function formatAppOpenedMessage(data: AppOpenedData): string {
  const date = new Date(data.timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return `📱 *App Opened*\n\n` +
    `*Time:* ${date}\n` +
    `*Platform:* ${data.platform || 'Unknown'}\n` +
    `*Browser:* ${data.browser || 'Unknown'}\n` +
    `*Screen:* ${data.screenSize || 'Unknown'}\n` +
    `*Language:* ${data.language || 'Unknown'}\n\n` +
    `_User Agent:_\n\`${data.userAgent || 'Unknown'}\``;
}

async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram credentials not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: text,
          parse_mode: 'Markdown'
        }),
      }
    );

    const result = await response.json();
    
    if (!result.ok) {
      console.error('Telegram API error:', result);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const data = await req.json();
    
    let message: string;
    
    // Verificar tipo de notificação
    if (data.type === 'app_opened') {
      message = formatAppOpenedMessage(data as AppOpenedData);
    } else {
      message = formatRequestMessage(data as RequestData);
    }
    
    const success = await sendTelegramMessage(message);

    return new Response(
      JSON.stringify({ success, message: success ? 'Notification sent' : 'Failed to send notification' }),
      {
        status: success ? 200 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
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

