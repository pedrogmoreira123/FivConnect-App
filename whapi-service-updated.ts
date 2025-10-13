  async processMissedMessage(messageData: any, storage: any): Promise<void> {
    try {
      this.logger.info(`[WhapiService] Processando mensagem perdida: ${messageData.id}`);
      
      // Normalizar dados da mensagem
      const from = messageData.from || (messageData.from_me ? messageData.to : messageData.chat_id);
      const to = messageData.to || (messageData.from_me ? messageData.from : messageData.chat_id);
      const content = messageData.text?.body || messageData.body || messageData.text || '';
      const messageId = messageData.id || messageData.message_id;
      const timestamp = messageData.timestamp || Math.floor(Date.now() / 1000);
      const fromMe = messageData.from_me || false;
      const messageType = messageData.type || 'text';
      const chatId = messageData.chat_id || '';
      
      // Pular mensagens enviadas por nós
      if (fromMe) {
        this.logger.info(`[WhapiService] Ignorando mensagem enviada por nós: ${messageId}`);
        return;
      }
      
      // IGNORAR MENSAGENS DE GRUPOS (@g.us)
      if (chatId.includes('@g.us')) {
        this.logger.info(`[WhapiService] Ignorando mensagem de grupo: ${chatId}`);
        return;
      }
      
      // Normalizar número de telefone
      const normalizedPhone = from.replace(/@.*$/, '').replace(/\D/g, '');
      const contactPhone = normalizedPhone.startsWith('55') ? normalizedPhone.substring(2) : normalizedPhone;
      
      this.logger.info(`[WhapiService] Processando mensagem de ${messageData.from_name || contactPhone}: ${content}`);
      
      // Buscar ou criar cliente
      let client = await storage.getClientByPhone(contactPhone);
      
      // Verificar se o cliente pertence à empresa correta
      if (client && client.companyId !== '59b4b086-9171-4dbf-8177-b7c6d6fd1e33') {
        client = null; // Cliente de outra empresa, vamos criar um novo
      }
      
      if (!client) {
        client = await storage.createClient({
          name: messageData.from_name || `Cliente ${contactPhone}`,
          phone: contactPhone,
          email: null,
          companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33'
        });
        this.logger.info(`[WhapiService] Cliente criado: ${client.id}`);
      }
      
      // Buscar ou criar chat session
      this.logger.info(`[WhapiService] Buscando chat session para chatId: ${chatId}`);
      let chatSession = await storage.getChatSessionByChatId(chatId, '59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!chatSession) {
        this.logger.info(`[WhapiService] Nenhuma chat session encontrada para chatId ${chatId}, criando nova sessão`);
        
        // Gerar número de protocolo
        const today = new Date();
        const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
        const lastProtocol = await storage.getLastProtocolOfDay('59b4b086-9171-4dbf-8177-b7c6d6fd1e33', datePrefix);
        const protocolNumber = lastProtocol ? parseInt(lastProtocol.slice(-4)) + 1 : 1;
        const protocolString = `${datePrefix}${protocolNumber.toString().padStart(4, '0')}`;
        
        chatSession = await storage.createChatSession({
          chatId: chatId,
          clientId: client.id,
          companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33',
          status: 'waiting',
          priority: 'medium',
          protocolNumber: protocolNumber,
          lastMessageAt: new Date()
        });
        this.logger.info(`[WhapiService] ✅ Nova chat session criada: ${chatSession.id} com protocolo: ${protocolString}`);
      } else {
        this.logger.info(`[WhapiService] ✅ Chat session existente encontrada: ${chatSession.id} com status: ${chatSession.status}`);
      }
      
      // Verificar se mensagem já existe antes de salvar
      const existingMessage = await storage.getMessageByExternalId(messageId);
      if (existingMessage) {
        this.logger.info(`[WhapiService] Mensagem já existe, ignorando: ${messageId}`);
        return;
      }

      // Salvar mensagem com chatId
      const message = await storage.createMessage({
        conversationId: chatSession.id, // Usar chatSession.id como conversationId
        content: content,
        messageType: messageType,
        direction: 'incoming',
        externalId: messageId,
        chatId: chatId, // Adicionar chatId à mensagem
        metadata: {
          from: from,
          to: to,
          timestamp: timestamp,
          whapiMessageId: messageId
        }
      });
      
      this.logger.info(`[WhapiService] Mensagem salva: ${message.id}`);
      
      // Atualizar última mensagem da chat session
      await storage.updateChatSession(chatSession.id, {
        lastMessageAt: new Date()
      });
      
      this.logger.info(`[WhapiService] Mensagem perdida processada com sucesso: ${messageId}`);
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao processar mensagem perdida:`, error);
    }
  }

