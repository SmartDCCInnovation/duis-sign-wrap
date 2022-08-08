import * as tool from '../src/tool'
import { readFile } from 'node:fs/promises'
import { glob } from 'glob'
import { resolve } from 'node:path'

describe('tool', () => {
  let jarFile: string

  beforeAll(() => {
    const paths = glob.sync(`dccboxed-signing-tool/target/xmldsig-1*.jar`)
    if (paths.length !== 1) {
      throw new Error('too many versions of xmldsig found to test')
    }
    jarFile = paths[0]
  })

  test('defined', () => {
    expect(tool.runTool).toBeDefined()
  })

  test('missing-java', () => {
    return expect(
      tool.runTool({ xml: '', mode: 'sign', java: 'xxxjavaxxx' })
    ).rejects.toThrow('spawn xxxjavaxxx')
  })

  test('wrong-package', () => {
    return expect(
      tool.runTool({ xml: '', mode: 'sign', package: 'com.google' })
    ).rejects.toThrow('generic environment error')
  })

  test('missing-jar', () => {
    return expect(
      tool.runTool({ xml: '', mode: 'sign', jarFile: 'asdf.jar' })
    ).rejects.toThrow('generic environment error')
  })

  test('empty-input', () => {
    return expect(
      tool.runTool({ xml: '', mode: 'sign', jarFile })
    ).rejects.toThrow('generic application error')
  })

  test('bad-mode', () => {
    return expect(
      tool.runTool({ xml: '', mode: 'Sign' as 'sign', jarFile })
    ).rejects.toThrow('invalid mode')
  })

  test('buffer-input', () => {
    return readFile(
      resolve(__dirname, 'data', '8.2_READ_INVENTORY_REQUEST_DUIS.XML')
    ).then((b) =>
      expect(tool.runTool({ xml: b, mode: 'sign', jarFile })).resolves.toMatch(
        /<ds:Signature>/
      )
    )
  })

  test('string-input', () => {
    return readFile(
      resolve(__dirname, 'data', '8.2_READ_INVENTORY_REQUEST_DUIS.XML')
    ).then((b) =>
      expect(
        tool.runTool({ xml: b.toString('utf-8'), mode: 'sign', jarFile })
      ).resolves.toMatch(/<ds:Signature>/)
    )
  })

  test('invalid-duis', () => {
    return readFile(
      resolve(__dirname, 'data', '8.2_READ_INVENTORY_REQUEST_DUIS-invalid.XML')
    ).then((b) =>
      expect(
        tool.runTool({ xml: b.toString('utf-8'), mode: 'sign', jarFile })
      ).rejects.toThrow('validation failed')
    )
  })

  test('mssing-credentials', () => {
    return readFile(
      resolve(
        __dirname,
        'data',
        '8.2_READ_INVENTORY_REQUEST_DUIS-unknown-originator.XML'
      )
    ).then((b) =>
      expect(
        tool.runTool({ xml: b.toString('utf-8'), mode: 'sign', jarFile })
      ).rejects.toThrow('missing credentials')
    )
  })

  test('string-input-preserveCounter', () => {
    return readFile(
      resolve(__dirname, 'data', '8.2_READ_INVENTORY_REQUEST_DUIS.XML')
    ).then((b) =>
      expect(
        tool.runTool({
          xml: b.toString('utf-8'),
          mode: 'sign',
          jarFile,
          preserveCounter: true,
        })
      ).resolves.toMatch(/90-B3-D5-1F-30-01-00-00:90-B3-D5-1F-30-00-00-02:1000/)
    )
  })

  test('validate', () => {
    return readFile(
      resolve(__dirname, 'data', 'readfw-version-response.xml')
    ).then((b) =>
      expect(
        tool.runTool({ xml: b, mode: 'validate', jarFile })
      ).resolves.not.toMatch(/<ds:Signature>/)
    )
  })
})
