// Script para listar canais e configurar webhook
import axios from 'axios';

const WHAPI_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImExZDI2YWYyYmY4MjVmYjI5MzVjNWI3OTY3ZDA3YmYwZTMxZWIxYjcifQ.eyJwYXJ0bmVyIjp0cnVlLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vd2hhcGktYTcyMWYiLCJhdWQiOiJ3aGFwaS1hNzIxZiIsImF1dGhfdGltZSI6MTc1OTkyNTU4NCwidXNlcl9pZCI6IjhOejlLYU55ZG5kc2RtQ3lYdDROZjY2Rm9ldjIiLCJzdWIiOiI4Tno5S2FOeWRuZHNkbUN5WHQ0TmY2NkZvZXYyIiwiaWF0IjoxNzU5OTI1NTg0LCJleHAiOjE4MjA0MDU1ODQsImVtYWlsIjoicGVkcm8uZy5tb3JlaXJhMTIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInBlZHJvLmcubW9yZWlyYTEyM0BnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.PUZcorVT0yGlzNh7eX_dOoberdS5g_kZxhu0L0LoSf_VBvt-Jd69fu2xr19mQyzRgiqCD1UlBm90q8zEplCWkjvGDZDJghu68Uh2fH2W7gsdKA8_LPSxuEVhBv9UUwpIvgqpVd0_FW5bg8Qr4RPgkR9QXWMNXLfu9uWvSHkZLPDSrAMjB9UQmHbxzaZRaLDEZ6WZHbQ71QyQNwTHcWKZLy1LvyMyo-n0AJl8kE0_mYFovffbVnDl3i6Nur1k5yZrHwhjImSPLPHUDeLNk_xJW2ylEBCwdwzEpSqk0JjccDb8RUbyjWDiciBurkj9e_OcSlObIKVPCv3ogsRUNR3Fhw';

async function listChannelsAndConfigureWebhook() {
  try {
    console.log('🔍 Listando canais via Manager API...');
    
    // 1. Listar canais usando Partner API (GET com token do parceiro)
    const channelsResponse = await axios.get('https://manager.whapi.cloud/channels/', {
      headers: {
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Canais encontrados:', channelsResponse.data);
    
    // 2. Para cada canal, tentar configurar webhook
    if (channelsResponse.data && channelsResponse.data.length > 0) {
      for (const channel of channelsResponse.data) {
        console.log(`\n📱 Processando canal: ${channel.id}`);
        console.log(`   Nome: ${channel.name}`);
        console.log(`   Status: ${channel.status}`);
        console.log(`   Número: ${channel.phone || 'N/A'}`);
        
        // Procurar pelo canal +55 11 97224-4707
        if (channel.phone && channel.phone.includes('5511972244707')) {
          console.log(`   🎯 ENCONTRADO! Canal +55 11 97224-4707`);
          
          if (channel.token) {
            try {
              const webhookUrl = 'https://app.fivconnect.net/api/whatsapp/webhook';
              
              console.log(`   🔧 Configurando webhook: ${webhookUrl}`);
              
              const webhookResponse = await axios.patch(
                'https://gate.whapi.cloud/settings',
                {
                  webhooks: [{
                    url: webhookUrl,
                    events: [
                      { type: "messages", method: "post" },
                      { type: "statuses", method: "post" }
                    ],
                    mode: "method"
                  }]
                },
                {
                  headers: {
                    'Authorization': `Bearer ${channel.token}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 30000
                }
              );
              
              console.log(`   ✅ Webhook configurado com sucesso!`);
              console.log(`   📋 Resposta:`, webhookResponse.data);
            } catch (error) {
              console.log(`   ❌ Erro ao configurar webhook:`, error.response?.data || error.message);
            }
          } else {
            console.log(`   ⚠️ Canal não possui token`);
          }
        }
      }
    } else {
      console.log('❌ Nenhum canal encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.response?.data || error.message);
  }
}

listChannelsAndConfigureWebhook();
