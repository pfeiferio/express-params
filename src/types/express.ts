import type {ParameterContainer} from "../parameter-container/ParameterContainer.js";

declare module "express-serve-static-core" {
  interface Request {
    validationOnly?: boolean
    initParams: (fn: (container: ParameterContainer) => void | Promise<void>) => Promise<Record<string, unknown>>
  }
}

export {};

