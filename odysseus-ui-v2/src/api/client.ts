import type { ApiErrorBody } from './types'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function detailMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Request failed'
  const detail = (body as ApiErrorBody).detail
  if (typeof detail === 'string') return detail
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    return String((detail as { message?: string }).message)
  }
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  return 'Request failed'
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuthRedirect?: boolean
}

async function handleResponse<T>(
  path: string,
  res: Response,
  skipAuthRedirect?: boolean,
): Promise<T> {
  if (res.status === 401 && !skipAuthRedirect && !path.includes('/api/auth/')) {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : await res.text()

  if (!res.ok) {
    throw new ApiError(detailMessage(payload), res.status, payload)
  }

  return payload as T
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRedirect, headers, ...rest } = options

  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(body !== undefined && !(body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  })

  return handleResponse<T>(path, res, skipAuthRedirect)
}

export const api = {
  get: <T>(path: string, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'PUT', body }),
  delete: <T>(path: string, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'DELETE', body: init?.body }),
  postForm: <T>(path: string, form: FormData, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'POST', body: form }),
  patchForm: <T>(path: string, form: FormData, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'PATCH', body: form }),
}

/** Consume an SSE probe stream until the connection closes. */
export async function consumeProbeStream(path: string): Promise<void> {
  const res = await fetch(path, { credentials: 'include' })
  if (!res.ok) {
    return handleResponse(path, res)
  }
  const reader = res.body?.getReader()
  if (!reader) return
  while (true) {
    const { done } = await reader.read()
    if (done) break
  }
}
