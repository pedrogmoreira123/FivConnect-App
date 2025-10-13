// Script para configurar webhook usando o serviço existente
import { WhapiService } from './server/whapi-service.js';
import { Logger } from 'pino';

const logger = Logger({
  level: 'info',
  transport: {
    target: 'pino-pretty'
  }
});

async function configureWebhookForChannel() {
  try {
    console.log('🔧 Configurando webhook usando WhapiService...');
    
    // Criar instância do WhapiService
    const whapiService = new WhapiService(logger);
    
    // Token do canal (você precisa obter este token do canal +55 11 97224-4707)
    // Por enquanto, vou mostrar como seria a configuração
    const channelToken = 'SEU_TOKEN_DO_CANAL_AQUI'; // Substitua pelo token real
    const webhookUrl = 'https://app.fivconnect.net/api/whatsapp/webhook';
    
    console.log(`📋 Para configurar o webhook:`);
    console.log(`1. Obtenha o token do canal +55 11 97224-4707`);
    console.log(`2. Substitua 'SEU_TOKEN_DO_CANAL_AQUI' pelo token real`);
    console.log(`3. Execute este script novamente`);
    
    if (channelToken !== 'SEU_TOKEN_DO_CANAL_AQUI') {
      console.log(`\n🔧 Configurando webhook...`);
      console.log(`   URL: ${webhookUrl}`);
      console.log(`   Token: ${channelToken.substring(0, 20)}...`);
      
      try {
        const result = await whapiService.configureWebhook(channelToken, webhookUrl);
        console.log(`✅ Webhook configurado com sucesso!`);
        console.log(`📋 Resposta:`, result);
      } catch (error) {
        console.log(`❌ Erro ao configurar webhook:`, error.message);
      }
    } else {
      console.log(`\n⚠️ Token não configurado. Configure o token do canal primeiro.`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

configureWebhookForChannel();
