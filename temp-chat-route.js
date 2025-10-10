// Rota para buscar mensagens por Chat ID
router.get('/messages/chat/:chatId', requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log(`[WhatsApp Routes] Buscando mensagens do chat: ${chatId}`);
    
    // Buscar conexão ativa
    const connections = await storage.getWhatsAppConnectionsByCompany(req.user!.companyId);
    const activeConnection = connections.find(c => c.status === 'connected' && c.whapiToken);
    
    if (!activeConnection) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma conexão ativa encontrada'
      });
    }
    
    // Buscar mensagens por Chat ID
    const messages = await whapiService.getMessagesByChatId(activeConnection.whapiToken!, chatId);
    
    res.json({
      success: true,
      data: {
        chatId,
        messages,
        count: messages.length
      }
    });
  } catch (error: any) {
    console.error('[WhatsApp Routes] Erro ao buscar mensagens do chat:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar mensagens do chat',
      error: error.message
    });
  }
});


