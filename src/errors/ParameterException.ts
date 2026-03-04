import {ErrorStore} from "@pfeiferio/validator";

export const REF_SYMBOL = Symbol.for('@pfeiferio/validator@1/isParameterException')

export class ParameterException extends Error {

  [REF_SYMBOL] = true

  readonly errorStore: ErrorStore

  constructor(errors: ErrorStore) {
    super('parameter validation failed')
    this.errorStore = errors
  }
}

export const isParameterError = (value: unknown): value is ParameterException => {
  return typeof value === 'object' && value != null && (value as any)[REF_SYMBOL] === true
}
