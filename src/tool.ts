/*
 * Created on Thu Jul 21 2022
 *
 * Copyright (c) 2022 Smart DCC Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { resolve } from 'path'
import { spawn } from 'node:child_process'
import { ChildProcessWithoutNullStreams } from 'child_process'

const jarFile = resolve(__dirname, 'tool.jar')

export interface ToolOptions {
  /**
   * Input xml DUIS
   */
  xml: string | Buffer

  /**
   * Mode
   */
  mode: 'sign' | 'validate'

  /**
   * Preserve counter value in RequestID when signing
   */
  preserveCounter?: boolean

  /**
   * Override the location of the xmldsig jar file, used for testing.
   */
  jarFile?: string

  /**
   * Java executable, if omitted with rely on system PATH to resolve, used for testing.
   */
  java?: string

  /**
   * Java package, used for testing.
   */
  package?: string
}

export function runTool(options: ToolOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    let mode: string
    const additionalOptions: string[] = []
    if (options.mode === 'sign') {
      mode = 'Sign'
      if (options.preserveCounter) {
        additionalOptions.push('--preserveCounter')
      }
    } else if (options.mode === 'validate') {
      mode = 'Validate'
    } else {
      throw new Error('invalid mode')
    }

    let cp: ChildProcessWithoutNullStreams
    try {
      cp = spawn(
        options.java ?? 'java',
        [
          '-cp',
          options.jarFile ?? jarFile,
          `${options.package ?? 'uk.co.smartdcc.boxed.xmldsig'}.${mode}`,
          '-',
        ].concat(additionalOptions),
      )
    } catch (e) {
      reject(e)
      return
    }
    let stdoutBuffer = Buffer.alloc(0)
    let stderrBuffer = Buffer.alloc(0)
    cp.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer = Buffer.concat([stdoutBuffer, chunk])
    })
    cp.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer = Buffer.concat([stderrBuffer, chunk])
    })
    cp.on('error', reject)
    cp.on('close', (code) => {
      if (code === 0 /* success */) {
        return resolve(stdoutBuffer.toString('utf-8'))
      } else if (code === 1 /* generic environment error */) {
        return reject(
          new Error(
            'generic environment error\n' + stderrBuffer.toString('utf-8'),
          ),
        )
      } else if (code === 2 /* generic application error */) {
        return reject(
          new Error(
            'generic application error\n' + stderrBuffer.toString('utf-8'),
          ),
        )
      } else if (code === 3 /* missing key material */) {
        return reject(
          new Error('missing credentials\n' + stderrBuffer.toString('utf-8')),
        )
      } else if (code === 10 /* validation error */) {
        return reject(
          new Error('validation failed\n' + stderrBuffer.toString('utf-8')),
        )
      }
      reject(new Error('unknown exit code\n' + stderrBuffer.toString('utf-8')))
    })
    cp.stdin.on('error', () => {
      /* empty, masks EPIPE when java executable does not exist */
    })
    if (Buffer.isBuffer(options.xml)) {
      cp.stdin.end(options.xml, 'utf-8')
    } else {
      cp.stdin.end(options.xml)
    }
  })
}
