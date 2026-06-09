import { getApiBaseUrl } from './env';

type RequestOptions = RequestInit & {
  token?: string;
};

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
};

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  return requestWithOptionalRefresh<TResponse>(path, options, true);
}

async function requestWithOptionalRefresh<TResponse>(
  path: string,
  options: RequestOptions,
  shouldTryRefresh: boolean,
): Promise<TResponse> {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 401 && shouldTryRefresh && path !== '/auth/refresh') {
    try {
      await requestWithOptionalRefresh('/auth/refresh', { method: 'POST' }, false);
      return requestWithOptionalRefresh<TResponse>(path, options, false);
    } catch {
      // Fall through to the original error handling.
    }
  }

  if (!response.ok) {
    let errorBody: ApiErrorResponse | null = null;

    try {
      errorBody = (await response.json()) as ApiErrorResponse;
    } catch {
      errorBody = null;
    }

    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(', ')
      : errorBody?.message ?? errorBody?.error;

    throw new Error(message ?? `API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

function getCsrfToken() {
  if (typeof document === 'undefined') {
    return null;
  }

  return (
    document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('wcpp_csrf='))
      ?.split('=')[1] ?? null
  );
}
