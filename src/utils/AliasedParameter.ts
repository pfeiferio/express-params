import type {Parameter} from "@pfeiferio/validator";

export class AliasedParameter {
  constructor(
    readonly param: Parameter,
    readonly alias: string
  ) {
  }
}

export const withAlias = (param: Parameter, alias: string) => new AliasedParameter(param, alias)
