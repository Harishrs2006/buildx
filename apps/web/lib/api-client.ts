import { ApiResponse, ApiError } from '@buildx/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_VERSION = 'v1';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...fetchOptions.headers,
  };

  const response = await fetch(`${BASE_URL}/api/${API_VERSION}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const json = (await response.json()) as ApiResponse<T> | ApiError;

  if (!response.ok || !json.success) {
    const err = json as ApiError;
    throw new ApiClientError(
      err.error.code,
      err.error.message,
      response.status,
      err.error.details
    );
  }

  return (json as ApiResponse<T>).data;
}

export const apiClient = {
  get: <T>(endpoint: string, opts?: RequestOptions) =>
    request<T>(endpoint, { ...opts, method: 'GET' }),

  post: <T>(endpoint: string, body: unknown, opts?: RequestOptions) =>
    request<T>(endpoint, {
      ...opts,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown, opts?: RequestOptions) =>
    request<T>(endpoint, {
      ...opts,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown, opts?: RequestOptions) =>
    request<T>(endpoint, {
      ...opts,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, opts?: RequestOptions) =>
    request<T>(endpoint, { ...opts, method: 'DELETE' }),
};

export { ApiClientError };
