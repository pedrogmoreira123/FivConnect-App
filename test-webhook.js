// Script para testar configuração de webhook diretamente
import axios from 'axios';

// Token do canal específico (você precisa obter este token do canal +55 11 97224-4707)
// Por enquanto, vou tentar configurar o webhook diretamente
const WEBHOOK_URL = 'https://app.fivconnect.net/api/whatsapp/webhook';

async function testWebhookConfig() {
  try {
    console.log('🔍 Testando configuração de webhook...');
    console.log(`URL do webhook: ${WEBHOOK_URL}`);
    
    // Vou tentar configurar o webhook usando um token de canal que você precisa fornecer
    // Por enquanto, vou mostrar como seria a configuração
    
    console.log('\n📋 Para configurar o webhook, você precisa:');
    console.log('1. Obter o token do canal +55 11 97224-4707');
    console.log('2. Usar o endpoint: PATCH https://gate.whapi.cloud/settings');
    console.log('3. Com o payload:');
    console.log(JSON.stringify({
      webhooks: [{
        url: WEBHOOK_URL,
        events: [
          { type: "messages", method: "post" },
          { type: "statuses", method: "post" }
        ],
        mode: "method"
      }]
    }, null, 2));
    
    console.log('\n🔧 Alternativamente, você pode:');
    console.log('1. Acessar o painel admin do FivConnect');
    console.log('2. Ir para WhatsApp Settings');
    console.log('3. Encontrar a conexão do canal +55 11 97224-4707');
    console.log('4. Clicar em "Configurar Webhook"');
    
    // Vou tentar fazer uma chamada de teste para verificar se o webhook está funcionando
    console.log('\n🧪 Testando se o webhook está funcionando...');
    
    try {
      const testResponse = await axios.post(WEBHOOK_URL, {
        event: 'test',
        data: {
          from: '5511943274695@whatsapp.net',
          to: '5511972244707@whatsapp.net',
          text: { body: 'Teste de webhook' },
          type: 'text',
          timestamp: Math.floor(Date.now() / 1000)
        }
      }, {
        timeout: 5000
      });
      
      console.log('✅ Webhook respondeu:', testResponse.status);
    } catch (error) {
      console.log('❌ Webhook não respondeu:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testWebhookConfig();
