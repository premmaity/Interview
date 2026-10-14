const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
let inMemoryCsrfToken: string | undefined

export function setCsrfToken(token: string | undefined): void {
  inMemoryCsrfToken = token
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
  ) {
    super(message)
  }
}

function cookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000)
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  headers.set('X-Request-ID', crypto.randomUUID())
  if (options.body instanceof FormData === false && options.body != null) {
    headers.set('Content-Type', 'application/json')
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = inMemoryCsrfToken ?? cookie('im_csrf')
    if (csrf) headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  }
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
      signal: controller.signal,
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { message?: string; code?: string; request_id?: string } }
        | null
      throw new ApiError(
        body?.error?.message ?? 'The request could not be completed',
        response.status,
        body?.error?.code ?? 'request_failed',
        body?.error?.request_id ?? response.headers.get('X-Request-ID') ?? undefined,
      )
    }
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 408, 'timeout')
    }
    throw new ApiError('Unable to reach Interview Mentor', 0, 'network_error')
  } finally {
    window.clearTimeout(timeout)
  }
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value)
}
