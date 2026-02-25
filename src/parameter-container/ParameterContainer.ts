import type {Parameter, SchemaValidationResult} from "@pfeiferio/validator";
import {createParameter, Schema, SearchStore} from "@pfeiferio/validator";
import type {ResolvedSearchData} from "../types/types.js";
import {AliasedParameter} from "../utils/AliasedParameter.js";

export class ParameterContainer<T extends boolean = false> {

  readonly #search: SearchStore

  readonly #schema: Schema<T>

  readonly #namespaceParams: Record<string, Record<string, Parameter>> = {}

  readonly #namespaceRoots: Record<string, Parameter> = {}

  constructor(searchData: ResolvedSearchData) {

    this.#schema = new Schema();
    this.#search = new SearchStore(searchData)

    Object.keys(searchData).forEach(namespace => {
      this.#namespaceParams[namespace] = {}
      this.#namespaceRoots[namespace] = createParameter(namespace).object(this.#namespaceParams[namespace])
      this.#schema.add(this.#namespaceRoots[namespace])
    })
  }

  getValues(): Record<string, unknown> {
    return Object.keys(this.#namespaceRoots).reduce((acc, namespace) => {
      return {...acc, ...this.#namespaceRoots[namespace]!.value as Record<string, unknown>}
    }, {})
  }

  addQueryParameter(param: Parameter | AliasedParameter): this {
    return this.addParameter(param, 'query')
  }

  addBodyParameter(param: Parameter | AliasedParameter): this {
    return this.addParameter(param, 'body')
  }

  addUrlParameter(param: Parameter | AliasedParameter): this {
    return this.addParameter(param, 'url')
  }

  addFileParameter(param: Parameter | AliasedParameter): this {
    return this.addParameter(param, 'files')
  }

  addParameter(param: Parameter | AliasedParameter, namespace: string): this {

    const isAlias = param instanceof AliasedParameter
    const paramName = isAlias ? param.alias : param.name

    if (!this.#namespaceParams[namespace]) throw new Error(`Unknown namespace: "${namespace}"`)
    this.#namespaceParams[namespace][paramName] = isAlias ? param.param : param
    return this
  }

  validate(): Promise<SchemaValidationResult> | SchemaValidationResult {
    return this.#schema.validate(this.#search)
  }
}
