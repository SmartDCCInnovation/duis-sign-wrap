import * as index from '../src/index'
import { readFile } from 'node:fs/promises'
import { globSync } from 'glob'
import { resolve } from 'node:path'
import * as server from '../src/server'

jest.mock('../src/server', () => ({
  ...jest.requireActual('../src/server'),
  makeSignDuisRequest: jest.fn(),
  makeVerifyDuisRequest: jest.fn(),
}))

describe('index with tool', () => {
  let jarFile: string

  beforeAll(() => {
    const paths = globSync(`dccboxed-signing-tool/target/xmldsig-2*.jar`)
    if (paths.length !== 1) {
      throw new Error('too many versions of xmldsig found to test')
    }
    jarFile = paths[0]
  })

  test('sign', () => {
    return readFile(
      resolve(__dirname, 'data', '8.2_READ_INVENTORY_REQUEST_DUIS.XML')
    ).then((b) =>
      expect(
        index.signDuis({ xml: b.toString('utf-8'), jarFile })
      ).resolves.toMatch(/<ds:Signature>/)
    )
  })

  test('validate', () => {
    return readFile(
      resolve(__dirname, 'data', 'readfw-version-response.xml')
    ).then((b) =>
      expect(index.validateDuis({ xml: b, jarFile })).resolves.not.toMatch(
        /<ds:Signature>/
      )
    )
  })
})

describe('index with backend', () => {
  const mockMakeSignDuisRequest = server.makeSignDuisRequest as jest.Mock
  const mockMakeVerifyDuisRequest = server.makeVerifyDuisRequest as jest.Mock

  beforeEach(() => {
    mockMakeSignDuisRequest.mockClear()
    mockMakeVerifyDuisRequest.mockClear()
  })

  test('sign', async () => {
    mockMakeSignDuisRequest.mockResolvedValue('<signed/>')
    const xml = await readFile(
      resolve(__dirname, 'data', '8.2_READ_INVENTORY_REQUEST_DUIS.XML')
    )

    const result = await index.signDuis({ xml: xml.toString('utf-8'), backend: true })

    expect(mockMakeSignDuisRequest).toHaveBeenCalledWith({
      backend: true,
      xml: xml.toString('utf-8'),
      headers: undefined,
    })
    expect(result).toBe('<signed/>')
  })

  test('validate', async () => {
    mockMakeVerifyDuisRequest.mockResolvedValue('<validated/>')
    const xml = await readFile(
      resolve(__dirname, 'data', 'readfw-version-response.xml')
    )

    const result = await index.validateDuis({ xml, backend: true })

    expect(mockMakeVerifyDuisRequest).toHaveBeenCalledWith({
      backend: true,
      xml,
      headers: undefined,
    })
    expect(result).toBe('<validated/>')
  })
})
