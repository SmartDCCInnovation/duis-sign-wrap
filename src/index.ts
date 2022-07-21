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

import { runTool } from './tool'

export interface SignOptions {
  /**
   * Unsigned DUIS xml string
   */
  xml: string | Buffer

  /**
   * Override the location of the xmldsig jar file, used for testing.
   */
  jarFile?: string
}

export function signDuis(options: SignOptions): Promise<string> {
  return runTool({
    ...options,
    mode: 'sign',
  })
}

export function validateDuis(options: SignOptions): Promise<string> {
  return runTool({
    ...options,
    mode: 'validate',
  })
}
