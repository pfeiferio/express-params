import type {ParameterContainer} from "../parameter-container/ParameterContainer.js";

declare module "express-serve-static-core" {
  interface Request {
    validationOnly?: boolean
    initParams: <T extends Record<string, unknown> = Record<string, unknown>>(fn: (container: ParameterContainer<false, T>) => void) => Promise<T>
    _paramNamespaces?: Record<string, string>
  }
}

export {};

