import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {createParameter} from '@pfeiferio/validator'
import {
  errorMiddleware,
  ParameterContainer,
  ParameterException,
  parameterMiddleware,
  ValidationOnlyException,
  validationOnlyMiddleware,
  withAlias
} from '../dist/index.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeSearchData = (body = {}, query = {}, url = {}, files = {}) => ({body, query, url, files})

const makeReq = (overrides = {}) => ({
  body: {},
  query: {},
  validationOnly: false,
  header: (_name) => undefined,
  initParams: undefined,
  ...overrides,
})

const makeRes = () => {
  const res = {}
  res.statusCode = 200
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (data) => {
    res.body = data
    return res
  }
  return res
}

const makeNext = () => {
  let called = false
  let calledWith = undefined
  const fn = (err) => {
    called = true
    calledWith = err
  }
  fn.wasCalled = () => called
  fn.calledWith = () => calledWith
  return fn
}

const paramNumber = createParameter('a', true).validation((val) => {
  if (typeof val !== 'number') throw new Error('required.number')
  return val
})

const paramNumberB = createParameter('b', true).validation((val) => {
  if (typeof val !== 'number') throw new Error('required.number')
  return val
})

// ─── ParameterContainer ───────────────────────────────────────────────────────

describe('ParameterContainer', () => {

  describe('addBodyParameter / addQueryParameter', () => {

    it('registers a body parameter and validates it', async () => {
      const container = new ParameterContainer(makeSearchData({a: 1}))
      container.addBodyParameter(paramNumber)
      const result = await container.validate()
      assert.equal(result.errors.hasErrors(), false)
      assert.deepEqual(container.getValues(), {a: 1})
    })

    it('registers a body parameter and validates it - with alias', async () => {
      const container = new ParameterContainer(makeSearchData({a: 1}))
      container.addBodyParameter(withAlias(paramNumber, 'number'))
      const result = await container.validate()
      assert.equal(result.errors.hasErrors(), false)
      assert.deepEqual(container.getValues(), {number: 1})
    })

    it('registers a query parameter and validates it', async () => {
      const container = new ParameterContainer(makeSearchData({}, {a: 1}))
      container.addQueryParameter(paramNumber)
      const result = await container.validate()
      assert.equal(result.errors.hasErrors(), false)
      assert.deepEqual(container.getValues(), {a: 1})
    })

    it('returns validation errors for invalid body parameter', async () => {
      const container = new ParameterContainer(makeSearchData({a: 'not-a-number'}))
      container.addBodyParameter(paramNumber)
      const result = await container.validate()
      assert.equal(result.errors.hasErrors(), true)
    })

    it('merges body and query values in getValues()', async () => {
      const container = new ParameterContainer(makeSearchData({a: 1}, {b: 2}))
      container.addBodyParameter(paramNumber)
      container.addQueryParameter(paramNumberB)
      const result = await container.validate()
      assert.equal(result.errors.hasErrors(), false)
      assert.deepEqual(container.getValues(), {a: 1, b: 2})
    })

    it('throws for unknown namespace in addParameter', () => {
      const container = new ParameterContainer(makeSearchData())
      assert.throws(
        () => container.addParameter(paramNumber, 'params'),
        /Unknown namespace: "params"/
      )
    })

    it('throws for unknown namespace in addParameter', () => {
      const container = new ParameterContainer(makeSearchData())
      assert.throws(
        () => container.addParameter(paramNumber, 'params'),
        /Unknown namespace: "params"/
      )
    })
  })
})

// ─── parameterMiddleware ──────────────────────────────────────────────────────

describe('parameterMiddleware', () => {

  describe('initParams', () => {

    it('returns validated values', async () => {
      const middleware = parameterMiddleware({
        resolveSearchData: (req) => ({body: req.body, query: req.query ?? {}})
      })

      const req = makeReq({body: {a: 1}})
      const next = makeNext()

      middleware(req, makeRes(), next)
      assert.equal(next.wasCalled(), true)

      const data = await req.initParams((container) => {
        container.addBodyParameter(paramNumber)
      })

      assert.deepEqual(data, {a: 1})
    })

    it('throws ParameterException for invalid values', async () => {
      const middleware = parameterMiddleware({
        resolveSearchData: (req) => ({body: req.body, query: req.query ?? {}})
      })

      const req = makeReq({body: {a: 'not-a-number'}})
      middleware(req, makeRes(), makeNext())

      await assert.rejects(
        () => req.initParams((container) => {
          container.addBodyParameter(paramNumber)
        }),
        (err) => err instanceof ParameterException
      )
    })

    it('throws ValidationOnlyException with data when validationOnly is set', async () => {
      const middleware = parameterMiddleware({
        resolveSearchData: (req) => ({body: req.body, query: req.query ?? {}})
      })

      const req = makeReq({
        body: {a: 1},
        header: (name) => name === 'x-validation-only' ? 'true' : undefined
      })
      middleware(req, makeRes(), makeNext())

      await assert.rejects(
        () => req.initParams((container) => {
          container.addBodyParameter(paramNumber)
        }),
        (err) => {
          assert.ok(err instanceof ValidationOnlyException)
          assert.deepEqual(err.data, {a: 1})
          return true
        }
      )
    })
  })

  describe('validationOnly header detection', () => {

    it('sets validationOnly=true when header matches', () => {
      const middleware = parameterMiddleware({
        resolveSearchData: (req) => ({body: req.body, query: req.query ?? {}})
      })

      const req = makeReq({
        header: (name) => name === 'x-validation-only' ? 'true' : undefined
      })
      middleware(req, makeRes(), makeNext())
      assert.equal(req.validationOnly, true)
    })

    it('does not set validationOnly when header is missing', () => {
      const middleware = parameterMiddleware({
        resolveSearchData: (req) => ({body: req.body, query: req.query ?? {}})
      })

      const req = makeReq()
      middleware(req, makeRes(), makeNext())
      assert.equal(req.validationOnly, false)
    })

    it('disables validationOnly mechanism when set to false', () => {
      const middleware = parameterMiddleware({
        resolveSearchData: (req) => ({body: req.body, query: req.query ?? {}}),
        validationOnly: false,
      })

      const req = makeReq({
        header: (name) => name === 'x-validation-only' ? 'true' : undefined
      })
      middleware(req, makeRes(), makeNext())
      assert.equal(req.validationOnly, false)
    })

    it('respects custom header name and value', () => {
      const middleware = parameterMiddleware({
        resolveSearchData: (req) => ({body: req.body, query: req.query ?? {}}),
        validationOnly: {header: 'x-dry-run', value: 'yes'},
      })

      const req = makeReq({
        header: (name) => name === 'x-dry-run' ? 'yes' : undefined
      })
      middleware(req, makeRes(), makeNext())
      assert.equal(req.validationOnly, true)
    })

    it('respects value as function', () => {
      const middleware = parameterMiddleware({
        resolveSearchData: (req) => ({body: req.body, query: req.query ?? {}}),
        validationOnly: {value: () => 'secret-token'},
      })

      const req = makeReq({
        header: (name) => name === 'x-validation-only' ? 'secret-token' : undefined
      })
      middleware(req, makeRes(), makeNext())
      assert.equal(req.validationOnly, true)
    })
  })
})

// ─── errorMiddleware ──────────────────────────────────────────────────────────

describe('errorMiddleware', () => {

  it('responds with 400 for ParameterException', async () => {
    const middleware = errorMiddleware()
    const container = new ParameterContainer(makeSearchData({a: 'invalid'}))
    container.addBodyParameter(paramNumber)
    const result = await container.validate()

    const err = new ParameterException(result.errors)
    const res = makeRes()
    const next = makeNext()

    middleware(err, makeReq(), res, next)

    assert.equal(res.statusCode, 400)
    assert.equal(next.wasCalled(), false)
  })

  it('calls next for unknown errors', () => {
    const middleware = errorMiddleware()
    const err = new Error('unknown')
    const res = makeRes()
    const next = makeNext()

    middleware(err, makeReq(), res, next)

    assert.equal(next.wasCalled(), true)
    assert.equal(next.calledWith(), err)
  })
})

// ─── validationOnlyMiddleware ─────────────────────────────────────────────────

describe('validationOnlyMiddleware', () => {

  it('responds with 200 and data for ValidationOnlyException', () => {
    const middleware = validationOnlyMiddleware()
    const err = new ValidationOnlyException({a: 1})
    const res = makeRes()
    const next = makeNext()

    middleware(err, makeReq(), res, next)

    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, {valid: true, data: {a: 1}})
    assert.equal(next.wasCalled(), false)
  })

  it('calls next for unknown errors', () => {
    const middleware = validationOnlyMiddleware()
    const err = new Error('unknown')
    const res = makeRes()
    const next = makeNext()

    middleware(err, makeReq(), res, next)

    assert.equal(next.wasCalled(), true)
    assert.equal(next.calledWith(), err)
  })

  // ParameterMiddleware.ts Zeile 25 — value: true
  it('normalizes value true to string "true"', () => {
    const middleware = parameterMiddleware({
      resolveSearchData: (req) => ({body: req.body, query: req.query ?? {}}),
      validationOnly: {value: true},
    })

    const req = makeReq({
      header: (name) => name === 'x-validation-only' ? 'true' : undefined
    })
    middleware(req, makeRes(), makeNext())
    assert.equal(req.validationOnly, true)
  })

// ParameterContainer.ts Zeilen 42-43, 46-47 — Convenience-Wrapper
  it('addBodyParameter is a shortcut for addParameter body', async () => {
    const container = new ParameterContainer(makeSearchData({a: 1}))
    container.addBodyParameter(paramNumber)
    const result = await container.validate()
    assert.equal(result.errors.hasErrors(), false)
  })

  it('addQueryParameter is a shortcut for addParameter query', async () => {
    const container = new ParameterContainer(makeSearchData({}, {a: 1}))
    container.addQueryParameter(paramNumber)
    const result = await container.validate()
    assert.equal(result.errors.hasErrors(), false)
  })

  it('addUrlParameter is a shortcut for addParameter url', async () => {
    const container = new ParameterContainer(makeSearchData({}, {}, {a: 1}))
    container.addUrlParameter(paramNumber)
    const result = await container.validate()
    assert.equal(result.errors.hasErrors(), false)
  })

  it('addFileParameter is a shortcut for addParameter file', async () => {
    const container = new ParameterContainer(makeSearchData({}, {}, {}, {a: 1}))
    container.addFileParameter(paramNumber)
    const result = await container.validate()
    assert.equal(result.errors.hasErrors(), false)
  })
})
