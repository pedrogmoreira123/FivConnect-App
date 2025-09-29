/**
 * API client with automatic authentication headers
 */

export async function authenticatedRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = localStorage.getItem('authToken');
  
  // LOG DE DIAGNÓSTICO 1: Verificar token no localStorage
  console.log('🔍 [FRONTEND] Enviando requisição:', { method, url, hasToken: !!token });
  console.log('🔍 [FRONTEND] Token encontrado:', token ? `${token.substring(0, 20)}...` : 'NENHUM');
  
  if (!token) {
    console.log('❌ [FRONTEND] Nenhum token encontrado no localStorage');
    throw new Error('Authentication token not found');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  // LOG DE DIAGNÓSTICO 2: Verificar cabeçalho de autorização
  console.log('🔍 [FRONTEND] Cabeçalho de autorização configurado:', headers.Authorization);

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  // LOG DE DIAGNÓSTICO 3: Verificar resposta
  console.log('🔍 [FRONTEND] Resposta recebida:', { status: response.status, statusText: response.statusText });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log('❌ [FRONTEND] Erro na resposta:', errorData);
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  console.log('✅ [FRONTEND] Requisição bem-sucedida');
  return response;
}

export async function authenticatedGet(url: string): Promise<Response> {
  return authenticatedRequest('GET', url);
}

export async function authenticatedPost(url: string, data?: unknown): Promise<Response> {
  return authenticatedRequest('POST', url, data);
}

export async function authenticatedPut(url: string, data?: unknown): Promise<Response> {
  return authenticatedRequest('PUT', url, data);
}

export async function authenticatedDelete(url: string): Promise<Response> {
  return authenticatedRequest('DELETE', url);
}