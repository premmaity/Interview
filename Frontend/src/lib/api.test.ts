import { api, jsonBody, setCsrfToken } from './api'

describe('api client', () => {
  afterEach(() => {
    setCsrfToken(undefined)
    vi.unstubAllGlobals()
  })

  it('includes credentials and parses a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(api<{ ok: boolean }>('/health/live')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith('/health/live', expect.objectContaining({ credentials: 'include', method: 'GET' }))
  })

  it('maps structured errors without exposing raw responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'conflict', message: 'Already submitted', request_id: 'request-1' } }), { status: 409, headers: { 'Content-Type': 'application/json' } })))
    await expect(api('/api/v1/interviews', { method: 'POST', body: jsonBody({}) })).rejects.toEqual(expect.objectContaining({ status: 409, code: 'conflict', requestId: 'request-1' }))
  })

  it('uses an in-memory CSRF token for cross-origin mutations', async () => {
    let capturedHeaders: Headers | undefined
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers as Headers
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    setCsrfToken('rotated-token')
    await api('/api/v1/profile', { method: 'PUT', body: jsonBody({}) })
    expect(capturedHeaders?.get('X-CSRF-Token')).toBe('rotated-token')
  })
})
