import * as index from '../src/index'
import { readFile } from 'node:fs/promises'
import { glob } from 'glob'
import { resolve } from 'node:path'

describe('index', () => {
  let jarFile: string

  beforeAll(() => {
    const paths = glob.sync(`dccboxed-signing-tool/target/xmldsig-1*.jar`)
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
