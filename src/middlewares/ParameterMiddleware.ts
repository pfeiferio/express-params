import type {RequestHandler} from "express"
import type {ResolveSearchData} from "../types/types.js";
import {ParameterException} from "../errors/ParameterException.js";
import {ParameterContainer} from "../parameter-container/ParameterContainer.js";
import {ValidationOnlyException} from "../errors/ValidationOnlyException.js";

export interface ParameterMiddlewareOptions {
  resolveSearchData: ResolveSearchData,
  validationOnly?: false | {
    header?: string
    value?: string | true | (() => string)
  }

}

export const parameterMiddleware = (
  {resolveSearchData, validationOnly}: ParameterMiddlewareOptions
): RequestHandler => {

  const useValidationOnly = validationOnly !== false
  if (useValidationOnly) {
    validationOnly = {...(validationOnly ?? {})}
    validationOnly.header ??= 'x-validation-only'
    validationOnly.value ??= 'true'
    if (validationOnly.value === true) validationOnly.value = 'true'
  }

  const validationOnlyValueIsFn = validationOnly && typeof validationOnly.value === 'function'

  return (req, _res, next) => {
    req.validationOnly = false
    if (useValidationOnly && validationOnly) {
      const expectedValue = validationOnlyValueIsFn
        ? (validationOnly.value as () => string)()
        : validationOnly.value

      const modeValidationOnly = req.header(validationOnly.header!) === expectedValue
      if (modeValidationOnly) {
        req.validationOnly = true
      }
    }

    async function initParams<TData extends Record<string, unknown> = Record<string, unknown>>(fn: (container: ParameterContainer<false, TData>) => void): Promise<TData> {

      const searchData = resolveSearchData(req)
      const container = new ParameterContainer<false, TData>(searchData)
      fn(container)

      const result = await container.validate()
      if (result.errors.hasErrors()) {
        throw new ParameterException(result.errors)
      }

      const data = container.getValues()

      const aliased = await container.postValidate(data, result)
      if (result.errors.hasErrors()) {
        throw new ParameterException(result.errors)
      }

      if (req.validationOnly) throw new ValidationOnlyException(data)
      req._paramNamespaces = container.getNamespaceLookup()

      return {...data, ...aliased} as TData
    }

    req.initParams = initParams

    next()
  }
}
