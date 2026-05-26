export const REF_SYMBOL = Symbol.for('@pfeiferio/express-params@1/isPostValidationError')

export class PostValidationException extends Error {

  [REF_SYMBOL] = true

  readonly errors: Record<string, string>

  constructor(errors: Record<string, string>) {
    super('post validation failed')
    this.errors = errors
  }
}

export const isPostValidationError = (value: unknown): value is PostValidationException => {
  return typeof value === 'object' && value != null && (value as any)[REF_SYMBOL] === true
}

export function throwParameterError(errors: Record<string, string>): never
export function throwParameterError(name: string, reason: string): never
export function throwParameterError(errorsOrName: Record<string, string> | string, reason?: string): never {
  if (typeof errorsOrName === 'string') {
    throw new PostValidationException({[errorsOrName]: reason!})
  }
  throw new PostValidationException(errorsOrName)
}
