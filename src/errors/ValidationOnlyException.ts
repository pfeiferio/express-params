export class ValidationOnlyException extends Error {
  readonly data: Record<string, unknown>

  constructor(data: Record<string, unknown>) {
    super('validation only mode')
    this.data = data
  }
}
