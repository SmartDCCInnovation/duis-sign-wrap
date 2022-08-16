# DUIS Signing Wrapper

Lightweight TypeScript wrapper around
[SmartDCCInnovation/dccboxed-signing-tool][sign]. Exposes
`dccboxed-sogning-tool` as a JavaScript package with some additional marshalling
and error handling. 

## Usage

Developed using typescript with `node 16`.

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


## Other Info

Copyright 2022, Smart DCC Limited, All rights reserved. Project is licensed under GPLv3.


[duis]: https://smartenergycodecompany.co.uk/the-smart-energy-code-2/ "Smart Energy Code"
[boxed]: https://www.smartdcc.co.uk/our-smart-network/network-products-services/dcc-boxed/ "DCC Boxed"
[sign]: https://github.com/SmartDCCInnovation/dccboxed-signing-tool "DCC Boxed Signing Tool"
[parser]: https://github.com/SmartDCCInnovation/duis-parser "DUIS Parser"