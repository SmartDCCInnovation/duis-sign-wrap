/*
 * Created on Fri Feb 06 2026
 *
 * Copyright (c) 2026 Smart DCC Limited
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
import { ChildProcess, spawn } from 'node:child_process'
import { Socket } from 'node:net'

const jarFile = resolve(__dirname, 'tool.jar')
export const port = Math.round(Math.random() * 16384) + 32768

let child: ChildProcess | undefined

export async function startBackend(): Promise<void> {
  if (child !== undefined && child.exitCode === null) {
    /* already running */
    return
  }

  child = spawn(
    'java',
    [
      '-cp',
      jarFile,
      'uk.co.smartdcc.boxed.xmldsig.Server',
      '-p',
      port.toString(10),
    ],
    {
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  )

  let ctr = 0
  do {
    if (ctr > 10) {
      child?.kill()
      throw new Error('timeout waiting for server to start')
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50)
    })

    if (child.exitCode !== null) {
      throw new Error('server failed to start')
    }

    ctr++
  } while ((await checkPort(port)) === false)
}

export function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket()
    socket.setTimeout(100)
    socket.connect(port, '127.0.0.1', () => {
      socket.end()
      resolve(true)
    })
    socket.on('error', () => {
      resolve(false)
    })
  })
}

export function stopBackend(): void {
  if (child === undefined || child.exitCode !== null) {
    return
  }
  child.kill()
  child = undefined
}

process.on('exit', stopBackend)
process.on('SIGINT', stopBackend)
process.on('SIGTERM', stopBackend)

export interface HttpOptions {
  /**
   * Unsigned DUIS xml string
   */
  xml: string | Buffer

  /**
   * Http server backend, set to true to automatically manage a server instance
   */
  backend: true | URL

  /**
   * Additional http headers to pass to backend
   */
  headers?: Record<string, string>
}

export function buildUrl(backend: true | URL, mode: 'sign' | 'verify'): URL {
  if (backend === true) {
    return new URL(`http://localhost:${port}/${mode}`)
  }
  return new URL(mode, backend)
}

export async function makeRequest(
  url: URL,
  xml: string | Buffer,
  headers?: Record<string, string>,
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify({ message: Buffer.from(xml).toString('base64') }),
  })
  if (response.status !== 200) {
    const error = (await response.json()) as {
      error?: string
      errorCode?: string
    }
    throw new Error(error.errorCode ?? `HTTP ${response.status}`, {
      cause: error.error,
    })
  }
  const data = (await response.json()) as { message?: string }
  if (typeof data?.message !== 'string') {
    throw new Error('invalid response')
  }
  return Buffer.from(data.message, 'base64').toString('utf8')
}

/**
 * Signs a DUIS message using the HTTP backend.
 *
 * @param options - Configuration options including XML content and backend URL
 * @returns Promise resolving to the signed DUIS XML string
 * @throws Error if the backend returns a non-200 status or invalid response
 */
export async function makeSignDuisRequest(
  options: HttpOptions,
): Promise<string> {
  if (options.backend === true) {
    await startBackend()
  }

  return makeRequest(
    buildUrl(options.backend, 'sign'),
    options.xml,
    options.headers,
  )
}

/**
 * Validates and verifies a signed DUIS message using the HTTP backend.
 *
 * @param options - Configuration options including XML content and backend URL
 * @returns Promise resolving to the validated DUIS XML string without signature
 * @throws Error if the backend returns a non-200 status or invalid response
 */
export async function makeVerifyDuisRequest(
  options: HttpOptions,
): Promise<string> {
  if (options.backend === true) {
    await startBackend()
  }

  return makeRequest(
    buildUrl(options.backend, 'sign'),
    options.xml,
    options.headers,
  )
}
