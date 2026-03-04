export const REF_SYMBOL = Symbol.for('@pfeiferio/validator@1/isValidationOnlyException')

export class ValidationOnlyException extends Error {
  readonly data: Record<string, unknown>

  [REF_SYMBOL] = true

  constructor(data: Record<string, unknown>) {
    super('validation only mode')
    this.data = data
  }
}

export const isValidationOnlyException = (value: unknown): value is ValidationOnlyException => {
  return typeof value === 'object' && value != null && (value as any)[REF_SYMBOL] === true
}
