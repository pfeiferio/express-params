import {ErrorStore} from "@pfeiferio/validator";

export class ParameterException extends Error {

  readonly errorStore: ErrorStore

  constructor(errors: ErrorStore) {
    super('parameter validation failed')
    this.errorStore = errors
  }
}
