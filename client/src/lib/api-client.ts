import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/',
});

// Interceptor para adicionar o token de autenticação em todas as requisições
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔍 [api-client] Token adicionado ao cabeçalho da requisição.');
    } else {
      console.warn('⚠️ [api-client] Nenhum authToken encontrado no localStorage.');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Funções de compatibilidade para manter a API existente
export async function authenticatedGet(url: string) {
  const response = await apiClient.get(url);
  return response.data;
}

export async function authenticatedPost(url: string, data?: unknown) {
  const response = await apiClient.post(url, data);
  return response.data;
}

export async function authenticatedPut(url: string, data?: unknown) {
  const response = await apiClient.put(url, data);
  return response.data;
}

export async function authenticatedDelete(url: string) {
  const response = await apiClient.delete(url);
  return response.data;
}

export default apiClient;