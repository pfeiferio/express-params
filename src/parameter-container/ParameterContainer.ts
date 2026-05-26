import type {Parameter, SchemaValidationResult} from "@pfeiferio/validator";
import {createParameter, Schema, SearchStore} from "@pfeiferio/validator";
import type {PostValidationFn, ResolvedSearchData} from "../types/types.js";
import {AliasedParameter} from "../utils/AliasedParameter.js";
import {isPostValidationError} from "../errors/PostValidationException.js";

export class ParameterContainer<T extends boolean = false> {

  readonly #search: SearchStore

  readonly #schema: Schema<T>

  readonly #namespaceParams: Record<string, Record<string, Parameter>> = {}

  readonly #namespaceRoots: Record<string, Parameter> = {}

  readonly #postValidations: PostValidationFn[] = []

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

  addPostValidation(fn: PostValidationFn): this {
    this.#postValidations.push(fn)
    return this
  }

  getNamespaceLookup(): Record<string, string> {
    const lookup: Record<string, string> = {}
    for (const [namespace, params] of Object.entries(this.#namespaceParams)) {
      for (const name of Object.keys(params)) {
        lookup[name] = namespace
      }
    }
    return lookup
  }

  async postValidate(data: Record<string, unknown>, result: SchemaValidationResult): Promise<void> {
    for (const fn of this.#postValidations) {
      try {
        await fn(data)
      } catch (err) {
        if (!isPostValidationError(err)) throw err
        const lookup = this.getNamespaceLookup()
        for (const [name, reason] of Object.entries(err.errors)) {
          const namespace = lookup[name]
          result.errors.add({path: namespace ? `${namespace}.${name}` : name, name, reason})
        }
      }
    }
  }

  validate(): Promise<SchemaValidationResult> | SchemaValidationResult {
    return this.#schema.validate(this.#search) as SchemaValidationResult
  }
}
