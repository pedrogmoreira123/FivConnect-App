// Métodos temporários para adicionar ao whapi-service.ts

/**
 * Enviar mensagem de sticker
 */
async sendStickerMessage(to, stickerUrl) {
  this.logger.info(`📤 Enviando sticker para ${to}.`);
  const payload = {
    to: to,
    media: stickerUrl
  };

  try {
    const response = await axios.post(`${this.apiUrl}messages/sticker`, payload, {
      headers: this.headers,
    });
    this.logger.info(`✅ Sticker enviado com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendStickerMessage');
    throw new Error('Falha ao enviar sticker.');
  }
}

/**
 * Enviar mensagem de contato
 */
async sendContactMessage(to, contact) {
  this.logger.info(`📤 Enviando contato para ${to}.`);
  const payload = {
    to: to,
    contacts: [{
      name: {
        formatted_name: contact.name
      },
      phones: [{
        phone: contact.phone,
        type: 'MOBILE'
      }]
    }]
  };

  try {
    const response = await axios.post(`${this.apiUrl}messages/contact`, payload, {
      headers: this.headers,
    });
    this.logger.info(`✅ Contato enviado com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendContactMessage');
    throw new Error('Falha ao enviar contato.');
  }
}

/**
 * Enviar mensagem de resposta (quote)
 */
async sendReplyMessage(to, body, quotedMessageId) {
  this.logger.info(`📤 Enviando resposta para ${to}.`);
  const payload = {
    to: to,
    body: body,
    quoted: {
      id: quotedMessageId
    }
  };

  try {
    const response = await axios.post(`${this.apiUrl}messages/text`, payload, {
      headers: this.headers,
    });
    this.logger.info(`✅ Resposta enviada com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendReplyMessage');
    throw new Error('Falha ao enviar resposta.');
  }
}

/**
 * Enviar mensagem com token específico (para multi-tenant)
 */
async sendTextMessageWithToken(to, body, clientToken) {
  this.logger.info(`📤 Enviando texto para ${to} com token específico.`);
  const payload = {
    to: to,
    body: body
  };

  try {
    const response = await axios.post(`${this.apiUrl}messages/text`, payload, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
    });
    this.logger.info(`✅ Texto enviado com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendTextMessageWithToken');
    throw new Error('Falha ao enviar mensagem de texto.');
  }
}

/**
 * Enviar imagem com token específico (para multi-tenant)
 */
async sendImageMessageWithToken(to, imageUrl, caption, clientToken) {
  this.logger.info(`📤 Enviando imagem para ${to} com token específico.`);
  const payload = {
    to: to,
    media: imageUrl
  };

  if (caption) {
    payload.caption = caption;
  }

  try {
    const response = await axios.post(`${this.apiUrl}messages/image`, payload, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
    });
    this.logger.info(`✅ Imagem enviada com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendImageMessageWithToken');
    throw new Error('Falha ao enviar imagem.');
  }
}

/**
 * Enviar vídeo com token específico (para multi-tenant)
 */
async sendVideoMessageWithToken(to, videoUrl, caption, clientToken) {
  this.logger.info(`📤 Enviando vídeo para ${to} com token específico.`);
  const payload = {
    to: to,
    media: videoUrl
  };

  if (caption) {
    payload.caption = caption;
  }

  try {
    const response = await axios.post(`${this.apiUrl}messages/video`, payload, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
    });
    this.logger.info(`✅ Vídeo enviado com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendVideoMessageWithToken');
    throw new Error('Falha ao enviar vídeo.');
  }
}

/**
 * Enviar áudio com token específico (para multi-tenant)
 */
async sendAudioMessageWithToken(to, audioUrl, clientToken) {
  this.logger.info(`📤 Enviando áudio para ${to} com token específico.`);
  const payload = {
    to: to,
    media: audioUrl
  };

  try {
    const response = await axios.post(`${this.apiUrl}messages/audio`, payload, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
    });
    this.logger.info(`✅ Áudio enviado com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendAudioMessageWithToken');
    throw new Error('Falha ao enviar áudio.');
  }
}

/**
 * Enviar sticker com token específico (para multi-tenant)
 */
async sendStickerMessageWithToken(to, stickerUrl, clientToken) {
  this.logger.info(`📤 Enviando sticker para ${to} com token específico.`);
  const payload = {
    to: to,
    media: stickerUrl
  };

  try {
    const response = await axios.post(`${this.apiUrl}messages/sticker`, payload, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
    });
    this.logger.info(`✅ Sticker enviado com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendStickerMessageWithToken');
    throw new Error('Falha ao enviar sticker.');
  }
}

/**
 * Enviar contato com token específico (para multi-tenant)
 */
async sendContactMessageWithToken(to, contact, clientToken) {
  this.logger.info(`📤 Enviando contato para ${to} com token específico.`);
  const payload = {
    to: to,
    contacts: [{
      name: {
        formatted_name: contact.name
      },
      phones: [{
        phone: contact.phone,
        type: 'MOBILE'
      }]
    }]
  };

  try {
    const response = await axios.post(`${this.apiUrl}messages/contact`, payload, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
    });
    this.logger.info(`✅ Contato enviado com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendContactMessageWithToken');
    throw new Error('Falha ao enviar contato.');
  }
}

/**
 * Enviar resposta com token específico (para multi-tenant)
 */
async sendReplyMessageWithToken(to, body, quotedMessageId, clientToken) {
  this.logger.info(`📤 Enviando resposta para ${to} com token específico.`);
  const payload = {
    to: to,
    body: body,
    quoted: {
      id: quotedMessageId
    }
  };

  try {
    const response = await axios.post(`${this.apiUrl}messages/text`, payload, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
    });
    this.logger.info(`✅ Resposta enviada com sucesso para ${to}.`);
    return response.data;
  } catch (error) {
    this.handleApiError(error, 'sendReplyMessageWithToken');
    throw new Error('Falha ao enviar resposta.');
  }
}


