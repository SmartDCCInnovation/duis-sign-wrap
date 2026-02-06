import { startBackend, stopBackend, buildUrl, makeRequest, makeSignDuisRequest, makeVerifyDuisRequest } from '../src/server'
import { ChildProcess } from 'node:child_process'

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}))

global.fetch = jest.fn()

describe('startBackend', () => {
  const mockSpawn = require('node:child_process').spawn

  beforeEach(() => {
    jest.clearAllMocks()
    stopBackend()
  })

  afterEach(() => {
    stopBackend()
  })

  test('starts backend process', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)

    await startBackend()

    expect(mockSpawn).toHaveBeenCalledWith(
      'java',
      expect.arrayContaining(['-cp', expect.stringContaining('tool.jar'), 'uk.co.smartdcc.boxed.xmldsig.Server', '-p', expect.any(String)]),
      { stdio: ['ignore', 'inherit', 'inherit'] }
    )
  })

  test('does not start if already running', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)

    await startBackend()
    await startBackend()

    expect(mockSpawn).toHaveBeenCalledTimes(1)
  })

  test('restarts if previous process exited', async () => {
    const mockChild1 = { exitCode: 0, kill: jest.fn() } as unknown as ChildProcess
    const mockChild2 = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2)

    await startBackend()
    await startBackend()

    expect(mockSpawn).toHaveBeenCalledTimes(2)
  })

  test('waits 250ms before resolving', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)

    const start = Date.now()
    await startBackend()
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(250)
  })
})

describe('stopBackend', () => {
  const mockSpawn = require('node:child_process').spawn

  beforeEach(() => {
    jest.clearAllMocks()
    stopBackend()
  })

  test('kills running process', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)

    await startBackend()
    stopBackend()

    expect(mockChild.kill).toHaveBeenCalled()
  })

  test('does nothing if no process running', () => {
    expect(() => stopBackend()).not.toThrow()
  })

  test('does nothing if process already exited', async () => {
    const mockChild = { exitCode: 0, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)

    await startBackend()
    stopBackend()

    expect(mockChild.kill).not.toHaveBeenCalled()
  })
})

describe('buildUrl', () => {
  test('builds localhost URL when backend is true', () => {
    const url = buildUrl(true, 'sign')
    expect(url.hostname).toBe('localhost')
    expect(url.pathname).toBe('/sign')
    expect(url.protocol).toBe('http:')
  })

  test('builds localhost URL for verify mode', () => {
    const url = buildUrl(true, 'verify')
    expect(url.hostname).toBe('localhost')
    expect(url.pathname).toBe('/verify')
    expect(url.protocol).toBe('http:')
  })

  test('uses custom URL when provided', () => {
    const customUrl = new URL('https://example.com:8080/api/')
    const url = buildUrl(customUrl, 'sign')
    expect(url.href).toBe('https://example.com:8080/api/sign')
  })

  test('appends mode to custom URL', () => {
    const customUrl = new URL('http://backend.local/')
    const url = buildUrl(customUrl, 'verify')
    expect(url.pathname).toBe('/verify')
  })
})

describe('makeRequest', () => {
  const mockFetch = global.fetch as jest.Mock

  beforeEach(() => {
    mockFetch.mockClear()
  })

  test('sends POST request with base64 encoded xml', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ message: Buffer.from('<xml/>').toString('base64') }),
    })

    await makeRequest(new URL('http://localhost/sign'), '<test/>')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: Buffer.from('<test/>').toString('base64') }),
      })
    )
  })

  test('includes custom headers', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ message: 'dGVzdA==' }),
    })

    await makeRequest(new URL('http://localhost/sign'), '<xml/>', { 'X-Custom': 'value' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Custom': 'value' }),
      })
    )
  })

  test('returns decoded response', async () => {
    const xmlContent = '<signed/>'
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ message: Buffer.from(xmlContent).toString('base64') }),
    })

    const result = await makeRequest(new URL('http://localhost/sign'), '<xml/>')

    expect(result).toBe(xmlContent)
  })

  test('throws on non-200 status with errorCode', async () => {
    mockFetch.mockResolvedValue({
      status: 400,
      json: async () => ({ errorCode: 'VALIDATION_ERROR', error: 'Invalid XML' }),
    })

    await expect(makeRequest(new URL('http://localhost/sign'), '<xml/>'))
      .rejects.toThrow('VALIDATION_ERROR')
  })

  test('throws on non-200 status without errorCode', async () => {
    mockFetch.mockResolvedValue({
      status: 500,
      json: async () => ({}),
    })

    await expect(makeRequest(new URL('http://localhost/sign'), '<xml/>'))
      .rejects.toThrow('HTTP 500')
  })

  test('throws on invalid response format', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({}),
    })

    await expect(makeRequest(new URL('http://localhost/sign'), '<xml/>'))
      .rejects.toThrow('invalid response')
  })
})

describe('makeSignDuisRequest', () => {
  const mockFetch = global.fetch as jest.Mock
  const mockSpawn = require('node:child_process').spawn

  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllMocks()
  })

  test('starts backend when backend is true', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ message: 'dGVzdA==' }),
    })

    await makeSignDuisRequest({ xml: '<xml/>', backend: true })

    expect(mockSpawn).toHaveBeenCalled()
  })

  test('uses custom backend URL', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ message: 'dGVzdA==' }),
    })

    await makeSignDuisRequest({ xml: '<xml/>', backend: new URL('http://custom.com/') })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://custom.com/sign' }),
      expect.any(Object)
    )
  })

  test('passes headers to makeRequest', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ message: 'dGVzdA==' }),
    })

    await makeSignDuisRequest({ xml: '<xml/>', backend: new URL('http://test.com/'), headers: { 'X-Test': 'value' } })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Test': 'value' }),
      })
    )
  })
})

describe('makeVerifyDuisRequest', () => {
  const mockFetch = global.fetch as jest.Mock
  const mockSpawn = require('node:child_process').spawn

  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllMocks()
    stopBackend()
  })

  test('starts backend when backend is true', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ message: 'dGVzdA==' }),
    })

    await makeVerifyDuisRequest({ xml: '<xml/>', backend: true })

    expect(mockSpawn).toHaveBeenCalled()
  })

  test('uses custom backend URL', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ message: 'dGVzdA==' }),
    })

    await makeVerifyDuisRequest({ xml: '<xml/>', backend: new URL('http://custom.com/') })

    expect(mockFetch).toHaveBeenCalled()
  })
})
