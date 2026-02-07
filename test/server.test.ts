import { startBackend, stopBackend, buildUrl, makeRequest, makeSignDuisRequest, makeVerifyDuisRequest, checkPort, port } from '../src/server'
import { ChildProcess } from 'node:child_process'
import { createServer, Server } from 'node:net'

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}))

global.fetch = jest.fn()

describe('startBackend', () => {
  const mockSpawn = require('node:child_process').spawn
  let server: Server

  beforeEach(() => {
    jest.clearAllMocks()
    stopBackend()
  })

  afterEach((done) => {
    stopBackend()
    if (server?.listening) {
      server.close(done)
    } else {
      done()
    }
  })

  test('starts backend process', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)
    server = createServer()
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

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
    server = createServer()
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

    await startBackend()
    await startBackend()

    expect(mockSpawn).toHaveBeenCalledTimes(1)
  })

  test('restarts if previous process exited', async () => {
    const mockChild1 = { exitCode: 0, kill: jest.fn() } as unknown as ChildProcess
    const mockChild2 = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2)
    server = createServer()
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

    await expect(startBackend()).rejects.toThrow("server failed to start")
    await startBackend()

    expect(mockSpawn).toHaveBeenCalledTimes(2)
  })

  test('waits for port to be available', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)

    const startPromise = startBackend()
    await new Promise<void>((resolve) => setTimeout(resolve, 100))
    server = createServer()
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
    await startPromise

    expect(mockSpawn).toHaveBeenCalled()
  })

  test('throws when process exits before port is ready', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)
    setTimeout(() => { (mockChild as { exitCode: number }).exitCode = 1 }, 100)

    await expect(startBackend()).rejects.toThrow('server failed to start')
  })

  test('stops waiting after counter reaches limit', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)

    const start = Date.now()
    await expect(startBackend()).rejects.toThrow('timeout waiting for server to start')
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(500)
    expect(mockChild.kill).toHaveBeenCalledTimes(1)
  })

  test('succeeds when port becomes available at counter limit', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)

    setTimeout(async () => {
      server = createServer()
      await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
    }, 500)

    await startBackend()

    expect(mockSpawn).toHaveBeenCalled()
  })

  test('throws timeout and kills child when port not available within limit', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)

    await expect(startBackend()).rejects.toThrow('timeout waiting for server to start')
    expect(mockChild.kill).toHaveBeenCalled()
  })
})

describe('checkPort', () => {
  let server: Server

  afterEach((done) => {
    if (server?.listening) {
      server.close(done)
    } else {
      done()
    }
  })

  test('returns true when port is open', async () => {
    server = createServer()
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as { port: number }).port

    const result = await checkPort(port)

    expect(result).toBe(true)
  })

  test('returns false when port is closed', async () => {
    const result = await checkPort(54321)

    expect(result).toBe(false)
  })
})

describe('stopBackend', () => {
  const mockSpawn = require('node:child_process').spawn
  let server: Server

  beforeEach(() => {
    jest.clearAllMocks()
    stopBackend()
  })

  afterEach((done) => {
    if (server?.listening) {
      server.close(done)
    } else {
      done()
    }
  })

  test('kills running process', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)
    server = createServer()
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

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

    await expect(startBackend()).rejects.toThrow('server failed to start')
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
  let server: Server

  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllMocks()
  })

  afterEach((done) => {
    stopBackend()
    if (server?.listening) {
      server.close(done)
    } else {
      done()
    }
  })

  test('starts backend when backend is true', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)
    server = createServer()
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
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
  let server: Server

  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllMocks()
    stopBackend()
  })

  afterEach((done) => {
    stopBackend()
    if (server?.listening) {
      server.close(done)
    } else {
      done()
    }
  })

  test('starts backend when backend is true', async () => {
    const mockChild = { exitCode: null, kill: jest.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(mockChild)
    server = createServer()
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
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
