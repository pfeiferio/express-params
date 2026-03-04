# @pfeiferio/express-params

> Express middleware for structured, namespace-aware parameter validation powered by `@pfeiferio/validator`.

[![npm version](https://img.shields.io/npm/v/@pfeiferio/express-params.svg)](https://www.npmjs.com/package/@pfeiferio/express-params)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![codecov](https://codecov.io/gh/pfeiferio/express-params/branch/main/graph/badge.svg)](https://codecov.io/gh/pfeiferio/express-params)

---

## Features

- ✅ Namespace-aware parameter validation (`body`, `query`, `url`, `file`, or custom)
- ✅ Lazy validation — parameters are validated per-route, not globally
- ✅ Built-in `validationOnly` mode (dry-run via HTTP header)
- ✅ Structured error responses via `errorMiddleware`
- ✅ Parameter aliasing via `withAlias`
- ✅ Fully typed with TypeScript

---

## Installation

```bash
npm install @pfeiferio/express-params
```

---

## Basic Usage

```ts
import express from 'express'
import {parameterMiddleware, errorMiddleware} from '@pfeiferio/express-params'
import {createParameter} from '@pfeiferio/validator'
import {checkNumber} from '@pfeiferio/check-primitives'

const paramUserId = createParameter('userId', true).validation((val) => {
  return checkNumber(val)
})

const app = express()

app.use(express.json())
app.use(parameterMiddleware({
  resolveSearchData: (req) => ({
    body: req.body,
    query: req.query ?? {},
  })
}))

app.post('/users', async (req, res) => {
  const {userId} = await req.initParams(container => {
    container.addBodyParameter(paramUserId)
  })

  res.json({userId})
})

app.use(errorMiddleware())

app.listen(3000)
```

---

## Validation Only (Dry-Run)

Clients can trigger validation without executing the handler by sending a header. This is useful for real-time form
validation.

```ts
app.use(parameterMiddleware({
  resolveSearchData: (req) => ({
    body: req.body,
    query: req.query ?? {},
  }),
  validationOnly: {
    header: 'x-validation-only', // default
    value: 'true',               // default
  }
}))

// Add the middleware to handle the ValidationOnlyException
app.use(validationOnlyMiddleware())
```

The client sends:

```http
POST /users
x-validation-only: true
```

The handler is never executed. The response will be:

```json
{
  "valid": true,
  "data": {
    "userId": 1
  }
}
```

To disable the mechanism entirely:

```ts
validationOnly: false
```

To use a dynamic token as the value:

```ts
validationOnly: {
  value: () => myTokenStore.getCurrent()
}
```

---

## Custom Namespaces

By default `body` and `query` are supported. You can add any namespace by extending `resolveSearchData` and using
`addParameter` directly:

```ts
app.use(parameterMiddleware({
  resolveSearchData: (req) => ({
    body: req.body,
    query: req.query ?? {},
    url: req.params ?? {},
  })
}))

app.get('/users/:userId', async (req, res) => {
  const {userId} = await req.initParams(container => {
    container.addParameter(paramUserId, 'url')
  })

  res.json({userId})
})
```

---

## Parameter Aliasing

By default the key in the result matches the parameter name. Use `withAlias` to map it to a different key — useful when
the input field name differs from your domain language:

```ts
import {withAlias} from '@pfeiferio/express-params'

const paramA = createParameter('a', true).validation((val) => checkNumber(val))

app.post('/users', async (req, res) => {
  const {userId} = await req.initParams(container => {
    container.addBodyParameter(withAlias(paramA, 'userId'))
  })

  res.json({userId})
})
```

The parameter is still looked up as `a` in the request body, but the validated value is returned under `userId`.


---

## Error Handling

`errorMiddleware` catches `ParameterException` and responds with a `400`:

```ts
app.use(errorMiddleware())
```

For custom error shapes, pass a handler directly:

```ts
app.use(errorMiddleware((err, req, res, next) => {
  res.status(422).json({errors: err.errorStore.errors})
}))
```

`validationOnlyMiddleware` also accepts a custom handler:

```ts
app.use(validationOnlyMiddleware((err, req, res, next) => {
  res.status(200).json({ok: true, data: err.data})
}))
```

For cross-package checks (e.g. when multiple package versions may be installed), use the type guard helpers instead of
`instanceof`:

```ts
import {isParameterError, isValidationOnlyException} from '@pfeiferio/express-params'

app.use((err, req, res, next) => {
  if (isParameterError(err)) {
    res.status(400).json({errors: err.errorStore.errors})
    return
  }
  next(err)
})
```

---

## Design Goals

- **Namespace-aware** — validation is not limited to `body` and `query`
- **Lazy by design** — parameters are declared per-route, keeping handlers self-contained
- **Composable** — parameters are plain objects, reusable across routes
- **Escape hatches** — every default is overridable

---

## License

MIT
