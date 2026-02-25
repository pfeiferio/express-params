import type {ParameterContainer} from "../ParameterContainer.js";

declare module "express-serve-static-core" {
  interface Request {
    validationOnly?: boolean
    initParams: (fn: (container: ParameterContainer) => void | Promise<void>) => Promise<Record<string, unknown>>
  }
}
