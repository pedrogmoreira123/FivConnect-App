import { db } from './server/db.ts';
import { whatsappConnections } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function findConnection() {
  try {
    console.log('Buscando conexão com telefone 5511972244707...');
    const connections = await db.select().from(whatsappConnections).where(eq(whatsappConnections.phone, '5511972244707'));
    
    if (connections.length > 0) {
      console.log('✅ Conexão encontrada:');
      console.log(JSON.stringify(connections[0], null, 2));
    } else {
      console.log('❌ Nenhuma conexão encontrada com esse telefone');
      
      // Buscar todas as conexões para debug
      console.log('\nTodas as conexões disponíveis:');
      const allConnections = await db.select().from(whatsappConnections);
      allConnections.forEach(conn => {
        console.log(`- ID: ${conn.id}, Phone: ${conn.phone}, Status: ${conn.status}, Company: ${conn.companyId}`);
      });
    }
  } catch (error) {
    console.error('Erro:', error);
  }
  process.exit(0);
}

findConnection();
