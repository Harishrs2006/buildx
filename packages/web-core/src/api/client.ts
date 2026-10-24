import type { ZodType } from 'zod';

// Shared HTTP client for the BuildX API, used by the buyer and seller websites.
// - The base URL is always supplied by the app (e.g. from NEXT_PUBLIC_API_URL); nothing is
//   hardcoded here, and no provider keys ever live in the browser.
// - Every response is validated; an unexpected shape is an error, never a guess.
// - Handles both API response styles that exist today: the `{ success, data }` envelope
//   (most endpoints) and bare JSON (GET /products*), plus bare `{ message }` errors.

export type ApiClientOptions = {
  /** Absolute API base including the version prefix, e.g. `https://api.example.in/api/v1` */
  baseUrl: string;
  /** Returns a Firebase ID token for authenticated calls (not needed for location lookups) */
  getAuthToken?: () => Promise<string | null | undefined>;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

export type RequestOptions<T> = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  /** Validates the payload (after unwrapping the envelope, if any) */
  schema: ZodType<T>;
  /** true for endpoints wrapped in `{ success, data }` */
  envelope: boolean;
  auth?: boolean;
  /** e.g. 'no-store' to bypass HTTP caching (checkout re-checks) */
  cache?: RequestCache;
  /** Extra headers (e.g. Idempotency-Key on order creation); never overrides Accept/Content-Type/Authorization */
  headers?: Record<string, string>;
};

/** Error with the API's machine-readable code (or a client-side one). */
export class ApiClientError extends Error {
  constructor(
    message: string,
    /** API code (e.g. PINCODE_NOT_FOUND) or NETWORK_ERROR | TIMEOUT | INVALID_RESPONSE | HTTP_ERROR */
    readonly code: string,
    readonly status: number | null,
    readonly details?: unknown,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** True when the caller aborted the request (e.g. the buyer typed a new PIN) */
export const isAbortError = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type ApiClient = {
  request<T>(path: string, options: RequestOptions<T>): Promise<T>;
  /** Like `request`, but for paginated list endpoints that also need `meta` (total, hasNext, ...). */
  requestPage<T>(path: string, options: RequestOptions<T>): Promise<{ data: T; meta: PaginationMeta }>;
  readonly baseUrl: string;
};

const DEFAULT_TIMEOUT_MS = 10_000;

export function createApiClient(options: ApiClientOptions): ApiClient {
  let base: URL;
  try {
    base = new URL(options.baseUrl);
  } catch {
    throw new Error('createApiClient: baseUrl must be an absolute URL, e.g. https://api.example.in/api/v1');
  }
  if (base.protocol !== 'https:' && base.protocol !== 'http:') {
    throw new Error('createApiClient: baseUrl must use http(s)');
  }
  const baseUrl = base.toString().replace(/\/+$/, '');
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Fetches and JSON-decodes a response, raising the client's normal errors; does not touch the
  // `{ success, data }` envelope or validate against a schema — both `request` and `requestPage`
  // do that themselves, since they unwrap to different shapes.
  async function fetchJson(path: string, req: Pick<RequestOptions<unknown>, 'method' | 'query' | 'body' | 'signal' | 'auth' | 'cache' | 'headers'>): Promise<{ json: unknown; res: Response }> {
    const url = new URL(baseUrl + (path.startsWith('/') ? path : `/${path}`));
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }

    // Our own controller so a timeout and the caller's abort both cancel the request
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const onCallerAbort = () => controller.abort();
    if (req.signal?.aborted) controller.abort();
    req.signal?.addEventListener('abort', onCallerAbort);

    const headers: Record<string, string> = { ...req.headers, Accept: 'application/json' };
    if (req.body !== undefined) headers['Content-Type'] = 'application/json';
    if (req.auth && options.getAuthToken) {
      const token = await options.getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await doFetch(url.toString(), {
        method: req.method ?? 'GET',
        headers,
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
        signal: controller.signal,
        credentials: 'omit', // bearer tokens only; no cookies
        ...(req.cache ? { cache: req.cache } : {}),
      });
    } catch (err) {
      if (req.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
      if (timedOut) throw new ApiClientError('The server took too long to respond', 'TIMEOUT', null);
      throw new ApiClientError("Couldn't reach BuildX. Check your connection and try again.", 'NETWORK_ERROR', null);
    } finally {
      clearTimeout(timer);
      req.signal?.removeEventListener('abort', onCallerAbort);
    }

    const retryAfter = Number(res.headers.get('Retry-After'));
    const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      if (req.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
      throw new ApiClientError('Unexpected response from BuildX', res.ok ? 'INVALID_RESPONSE' : 'HTTP_ERROR', res.status, undefined, retryAfterSeconds);
    }

    if (!res.ok) {
      const body = json as { error?: { code?: unknown; message?: unknown; details?: unknown }; message?: unknown } | null;
      const code = typeof body?.error?.code === 'string' ? body.error.code : 'HTTP_ERROR';
      const message =
        typeof body?.error?.message === 'string' ? body.error.message
        : typeof body?.message === 'string' ? body.message
        : `Request failed (${res.status})`;
      throw new ApiClientError(message, code, res.status, body?.error?.details, retryAfterSeconds);
    }

    return { json, res };
  }

  function parseOrThrow<T>(payload: unknown, schema: RequestOptions<T>['schema'], status: number): T {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiClientError('Unexpected response from BuildX', 'INVALID_RESPONSE', status, parsed.error.issues.slice(0, 3));
    }
    return parsed.data;
  }

  async function request<T>(path: string, req: RequestOptions<T>): Promise<T> {
    const { json, res } = await fetchJson(path, req);

    let payload: unknown = json;
    if (req.envelope) {
      const env = json as { success?: unknown; data?: unknown } | null;
      if (env?.success !== true || !('data' in (env ?? {}))) {
        throw new ApiClientError('Unexpected response from BuildX', 'INVALID_RESPONSE', res.status);
      }
      payload = env.data;
    }

    return parseOrThrow(payload, req.schema, res.status);
  }

  async function requestPage<T>(path: string, req: RequestOptions<T>): Promise<{ data: T; meta: PaginationMeta }> {
    const { json, res } = await fetchJson(path, req);

    const env = json as { success?: unknown; data?: unknown; meta?: unknown } | null;
    if (env?.success !== true || !('data' in (env ?? {})) || !env.meta || typeof env.meta !== 'object') {
      throw new ApiClientError('Unexpected response from BuildX', 'INVALID_RESPONSE', res.status);
    }

    const data = parseOrThrow(env.data, req.schema, res.status);
    return { data, meta: env.meta as PaginationMeta };
  }

  return { request, requestPage, baseUrl };
}
