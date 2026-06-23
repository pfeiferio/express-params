import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {createParameter} from '@pfeiferio/validator'
import {parameterMiddleware} from '../dist/index.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (data) => { res.body = data; return res }
  return res
}

const makeNext = () => {
  const fn = (err) => { fn._called = true; fn._err = err }
  fn.wasCalled = () => fn._called ?? false
  return fn
}

// ─── validationContext ────────────────────────────────────────────────────────

describe('parameterMiddleware — validationContext', () => {

  it('passes static context object to parameter validation', async () => {
    let capturedContext

    const paramWithContext = createParameter('a', true).validation((val, ctx) => {
      capturedContext = ctx
      return val
    })

    const middleware = parameterMiddleware({
      resolveSearchData: (req) => ({body: req.body}),
      validationContext: {userId: 42, role: 'admin'},
    })

    const req = makeReq({body: {a: 1}})
    middleware(req, makeRes(), makeNext())

    await req.initParams((container) => {
      container.addBodyParameter(paramWithContext)
    })

    assert.deepEqual(capturedContext, {userId: 42, role: 'admin'})
  })

  it('passes context resolved from req when validationContext is a function', async () => {
    let capturedContext

    const paramWithContext = createParameter('a', true).validation((val, ctx) => {
      capturedContext = ctx
      return val
    })

    const middleware = parameterMiddleware({
      resolveSearchData: (req) => ({body: req.body}),
      validationContext: (req) => ({userId: req.userId, role: req.role}),
    })

    const req = makeReq({body: {a: 1}, userId: 99, role: 'editor'})
    middleware(req, makeRes(), makeNext())

    await req.initParams((container) => {
      container.addBodyParameter(paramWithContext)
    })

    assert.deepEqual(capturedContext, {userId: 99, role: 'editor'})
  })
})
