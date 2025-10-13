// Script para testar a API Partner usando o serviço existente
import { WhapiService } from './server/whapi-service.js';
import { Logger } from 'pino';

const logger = Logger({
  level: 'info',
  transport: {
    target: 'pino-pretty'
  }
});

async function testPartnerAPI() {
  try {
    console.log('🔧 Testando API Partner...');
    
    // Criar instância do WhapiService
    const whapiService = new WhapiService(logger);
    
    console.log('📋 Tentando buscar canais do parceiro...');
    
    try {
      const result = await whapiService.getPartnerChannels();
      console.log('✅ Canais encontrados:', result);
      
      if (result.channels && result.channels.length > 0) {
        console.log(`\n📱 Total de canais: ${result.channels.length}`);
        
        for (const channel of result.channels) {
          console.log(`\n📱 Canal: ${channel.id}`);
          console.log(`   Nome: ${channel.name || 'N/A'}`);
          console.log(`   Status: ${channel.status || 'N/A'}`);
          console.log(`   Número: ${channel.phone || 'N/A'}`);
          console.log(`   Token: ${channel.token ? 'Sim' : 'Não'}`);
          
          // Procurar pelo canal +55 11 97224-4707
          if (channel.phone && channel.phone.includes('5511972244707')) {
            console.log(`   🎯 ENCONTRADO! Canal +55 11 97224-4707`);
            
            if (channel.token) {
              console.log(`   🔧 Configurando webhook...`);
              try {
                const webhookUrl = 'https://app.fivconnect.net/api/whatsapp/webhook';
                const webhookResult = await whapiService.configureWebhook(channel.token, webhookUrl);
                console.log(`   ✅ Webhook configurado com sucesso!`);
                console.log(`   📋 Resposta:`, webhookResult);
              } catch (error) {
                console.log(`   ❌ Erro ao configurar webhook:`, error.message);
              }
            }
          }
        }
      } else {
        console.log('❌ Nenhum canal encontrado');
      }
    } catch (error) {
      console.log('❌ Erro ao buscar canais:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testPartnerAPI();
