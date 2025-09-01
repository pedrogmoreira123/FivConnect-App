/**
 * API client with automatic authentication headers
 */

export async function authenticatedRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

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