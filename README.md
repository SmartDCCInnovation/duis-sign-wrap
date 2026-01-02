![GitHub banner](https://user-images.githubusercontent.com/527411/192760138-a1f61694-f705-4358-b419-e5eeb78c2ea0.png)

# DUIS Signing Wrapper

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Tests](https://github.com/SmartDCCInnovation/duis-sign-wrap/actions/workflows/node.yml/badge.svg?branch=main&event=push)](https://github.com/SmartDCCInnovation/duis-sign-wrap/actions/workflows/node.yml)
[![codecov](https://codecov.io/gh/SmartDCCInnovation/duis-sign-wrap/branch/main/graph/badge.svg?token=1B4NJWD2J5)](https://codecov.io/gh/SmartDCCInnovation/duis-sign-wrap)
[![GitHub version](https://badge.fury.io/gh/SmartDCCInnovation%2Fduis-sign-wrap.svg)](https://badge.fury.io/gh/SmartDCCInnovation%2Fduis-sign-wrap)

Lightweight TypeScript wrapper around
[SmartDCCInnovation/dccboxed-signing-tool][sign] - which is a tool for signing
and validating [DUIS][duis] messages. This package `dccboxed-sogning-tool` as a
JavaScript package with some additional marshalling and error handling. That is,
it provides an API to create and validate an appropriately formatted `xmldsig`.  

## Usage

**Important: This package wraps around a JAR file, thus it is essential that a
Java Runtime Environment is installed and available in the PATH before using it.
Please use JRE 11 (or newer).**

From Debian/Ubuntu an appropriate JRE can be installed with:

```
sudo apt install openjdk-11-jre
```

Developed and tested against `node 24`. Install from `npm`:

```
npm i @smartdcc/duis-sign-wrap
```

### Sign DUIS

Below is a minimal example of how to use the library:

```ts
import { signDuis } from '@smartdcc/duis-sign-wrap'
import { readFile } from 'node:fs/promises'

const duisSigned: string = signDuis(await readFile('/path/to/duis/file-without-signature.xml'))
```

Providing no exception was raised, the resulting `duisSigned` should be
compatible with [DCC Boxed][boxed].

### Validate

Then to validate a signed DUIS against its XSD and remove the digital
signature:

```ts
import { validateDuis } from '@smartdcc/duis-sign-wrap'

const xml: string = validateDuis(duisSigned)
```

### Advanced

The intention is that this tool is compatible with the [duis-parser][parser] to
obtain a JSON representation of the [DUIS][duis]. A minimal example without
error handling would be:

```ts
import { validateDuis } from '@smartdcc/duis-sign-wrap'
import { parseDuis } from '@smartdcc/duis-parser'

const data =  parseDuis(validateDuis(duisSigned))
```

## Contributing

Contributions are welcome!

Remember, when developing it is required to install a JDK (to build the
`dccboxed-siging-tool`) and update submodules. To build the JAR file, run the
following command: `npm run build:jar`.

When submitting a pull request, please ensure:

  1. Each PR is concise and provides only one feature/bug fix.
  2. Unit test are provided to cover feature. The project uses `jest`. To test,
     run `npm run test:cov` to view code coverage metrics.
  3. Bugfixes are reference the GitHub issue.
  4. If appropriate, update documentation.
  5. Before committing, run `npm run lint` and `npm run prettier-check`.

If you are planning a new non-trivial feature, please first raise a GitHub issue
to discuss it to before investing your time to avoid disappointment.

Any contributions will be expected to be licensable under GPLv3.

## Other Info

Copyright 2022, Smart DCC Limited, All rights reserved. Project is licensed under GPLv3.


[duis]: https://smartenergycodecompany.co.uk/the-smart-energy-code-2/ "Smart Energy Code"
[boxed]: https://www.smartdcc.co.uk/our-smart-network/network-products-services/dcc-boxed/ "DCC Boxed"
[sign]: https://github.com/SmartDCCInnovation/dccboxed-signing-tool "DCC Boxed Signing Tool"
[parser]: https://github.com/SmartDCCInnovation/duis-parser "DUIS Parser"
