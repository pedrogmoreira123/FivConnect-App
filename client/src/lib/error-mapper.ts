/**
 * Mapeia erros de API para mensagens amigáveis em português
 */
export function mapApiErrorToMessage(error: any): string {
  // Se já é uma string, retorna como está
  if (typeof error === 'string') {
    return error;
  }

  // Se tem uma mensagem específica
  if (error?.message) {
    const message = error.message.toLowerCase();
    
    // Erros de validação
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Por favor, verifique os dados informados e tente novamente.';
    }
    
    // Erros de permissão
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('403')) {
      return 'Você não tem permissão para executar esta ação.';
    }
    
    // Erros de conflito
    if (message.includes('conflict') || message.includes('409')) {
      return 'O e-mail informado já está em uso.';
    }
    
    // Erros de não encontrado
    if (message.includes('not found') || message.includes('404')) {
      return 'O item solicitado não foi encontrado.';
    }
    
    // Erros de servidor
    if (message.includes('server') || message.includes('500')) {
      return 'Erro interno do servidor. Tente novamente em alguns instantes.';
    }
    
    // Erros de rede
    if (message.includes('network') || message.includes('connection')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    
    // Erros de timeout
    if (message.includes('timeout')) {
      return 'A operação demorou muito para ser concluída. Tente novamente.';
    }
    
    // Retorna a mensagem original se não conseguir mapear
    return error.message;
  }

  // Se tem um status code
  if (error?.status) {
    switch (error.status) {
      case 400:
        return 'Dados inválidos. Verifique as informações e tente novamente.';
      case 401:
        return 'Sessão expirada. Faça login novamente.';
      case 403:
        return 'Você não tem permissão para executar esta ação.';
      case 404:
        return 'O item solicitado não foi encontrado.';
      case 409:
        return 'O e-mail informado já está em uso.';
      case 422:
        return 'Dados inválidos. Verifique as informações e tente novamente.';
      case 429:
        return 'Muitas tentativas. Aguarde um momento e tente novamente.';
      case 500:
        return 'Erro interno do servidor. Tente novamente em alguns instantes.';
      case 502:
        return 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
      case 503:
        return 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }

  // Se tem um response com status
  if (error?.response?.status) {
    return mapApiErrorToMessage({ status: error.response.status });
  }

  // Mensagem padrão
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

/**
 * Mapeia erros específicos por contexto
 */
export function mapContextualError(error: any, context: string): string {
  const baseMessage = mapApiErrorToMessage(error);
  
  switch (context) {
    case 'user-creation':
      if (error?.message?.includes('email') || error?.message?.includes('409')) {
        return 'O e-mail informado já está em uso.';
      }
      if (error?.message?.includes('username')) {
        return 'O nome de usuário informado já está em uso.';
      }
      break;
      
    case 'user-update':
      if (error?.message?.includes('email') || error?.message?.includes('409')) {
        return 'O e-mail informado já está em uso.';
      }
      break;
      
    case 'queue-creation':
      if (error?.message?.includes('permission') || error?.status === 403) {
        return 'Apenas administradores podem criar filas.';
      }
      break;
      
    case 'announcement-edit':
      if (error?.message?.includes('permission') || error?.status === 403) {
        return 'Apenas superadministradores podem editar avisos.';
      }
      break;
      
    case 'whatsapp-connection':
      if (error?.message?.includes('connection') || error?.message?.includes('timeout')) {
        return 'Erro ao conectar com o WhatsApp. Verifique sua conexão e tente novamente.';
      }
      break;
  }
  
  return baseMessage;
}
