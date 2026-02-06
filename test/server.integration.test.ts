import { stopBackend } from '../src/server'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process'
import { globSync } from 'glob'

const { makeSignDuisRequest } = jest.requireActual('../src/server')

const originalSpawn = spawn

describe('makeSignDuisRequest integration', () => {
  let jarFile: string

  beforeAll(() => {
    const paths = globSync('dccboxed-signing-tool/target/xmldsig-2*.jar')
    if (paths.length !== 1) {
      throw new Error('jar file not found')
    }
    jarFile = resolve(paths[0])

    jest.spyOn(require('node:child_process'), 'spawn').mockImplementation((cmd, args, options) => {
      const updatedArgs = (args as string[])?.map(arg => arg.includes('tool.jar') ? jarFile : arg)
      return originalSpawn(cmd as string, updatedArgs, options as SpawnOptionsWithoutStdio | undefined)
    })
  })

  afterAll(() => {
    stopBackend()
    jest.restoreAllMocks()
  })

  test('signs DUIS with real backend', async () => {
    const xml = await readFile(
      resolve(__dirname, 'data', '8.2_READ_INVENTORY_REQUEST_DUIS.XML')
    )

    const result = await makeSignDuisRequest({ xml, backend: true })

    expect(result).toContain('<ds:Signature')
    expect(result).toContain('</ds:Signature>')
  }, 10000)
})
