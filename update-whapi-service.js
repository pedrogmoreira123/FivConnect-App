const fs = require('fs');

// Ler o arquivo
let content = fs.readFileSync('server/whapi-service.ts', 'utf8');

// Substituições necessárias
const replacements = [
  // Substituir variável conversation por chatSession
  [/let conversation = await storage\.getChatSessionByChatId\(client\.id/g, 'let chatSession = await storage.getChatSessionByChatId(chatId'],
  [/if \(!conversation\)/g, 'if (!chatSession)'],
  [/conversation = await storage\.createConversation/g, 'chatSession = await storage.createChatSession'],
  [/conversation\.id/g, 'chatSession.id'],
  [/conversation\.status/g, 'chatSession.status'],
  [/conversation\.isFinished/g, 'chatSession.status'],
  
  // Substituir createConversation por createChatSession
  [/await storage\.createConversation\(\{/g, 'await storage.createChatSession({'],
  [/clientId: client\.id,/g, 'chatId: chatId,\n          clientId: client.id,'],
  [/status: 'waiting',/g, 'status: \'waiting\','],
  [/priority: 'medium',/g, 'priority: \'medium\','],
  [/isGroup: false,/g, 'protocolNumber: protocolNumber,'],
  [/contactName: messageData\.from_name \|\| `Cliente \${contactPhone}`,\n          contactPhone: contactPhone/g, 'lastMessageAt: new Date()'],
  
  // Adicionar geração de protocolo
  [/Nenhuma chat session encontrada para chatId \${client\.id}, criando nova conversa/g, 'Nenhuma chat session encontrada para chatId ${chatId}, criando nova sessão'],
  [/Nova conversa criada/g, 'Nova chat session criada'],
  [/Conversa existente encontrada/g, 'Chat session existente encontrada'],
  
  // Substituir updateConversation por updateChatSession
  [/await storage\.updateConversation\(conversation\.id/g, 'await storage.updateChatSession(chatSession.id'],
  [/lastMessage: content,\n        lastMessageType: messageType,\n        lastMessageAt: new Date\(\)/g, 'lastMessageAt: new Date()'],
];

// Aplicar todas as substituições
replacements.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement);
});

// Adicionar geração de protocolo antes de createChatSession
const protocolCode = `        // Gerar número de protocolo
        const today = new Date();
        const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
        const lastProtocol = await storage.getLastProtocolOfDay('59b4b086-9171-4dbf-8177-b7c6d6fd1e33', datePrefix);
        const protocolNumber = lastProtocol ? parseInt(lastProtocol.slice(-4)) + 1 : 1;
        const protocolString = \`\${datePrefix}\${protocolNumber.toString().padStart(4, '0')}\`;
        
        `;

content = content.replace(
  /Nenhuma chat session encontrada para chatId \${chatId}, criando nova sessão/,
  `Nenhuma chat session encontrada para chatId \${chatId}, criando nova sessão\n        \n        ${protocolCode}`
);

// Adicionar chatId à mensagem
content = content.replace(
  /externalId: messageId,/,
  'externalId: messageId,\n        chatId: chatId, // Adicionar chatId à mensagem'
);

// Escrever o arquivo atualizado
fs.writeFileSync('server/whapi-service.ts', content);

console.log('✅ Arquivo whapi-service.ts atualizado com sucesso!');

