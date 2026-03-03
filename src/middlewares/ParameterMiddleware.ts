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

    req.initParams = async (fn) => {
      const searchData = resolveSearchData(req)
      const container = new ParameterContainer(searchData)
      await fn(container)
      const result = await container.validate()
      if (result.errors.hasErrors()) {
        throw new ParameterException(result.errors)
      }

      const data = container.getValues()

      if (req.validationOnly) throw new ValidationOnlyException(data)

      return data
    }

    next()
  }
}
