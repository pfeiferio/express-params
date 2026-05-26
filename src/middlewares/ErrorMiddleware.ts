import type {ErrorRequestHandler} from "express"
import {isParameterError, ParameterException} from "../errors/ParameterException.js";
import type {ParameterErrorRequestHandler} from "../types/types.js";
import {isPostValidationError} from "../errors/PostValidationException.js";
import {ErrorStore} from "@pfeiferio/validator";

export const errorMiddleware = (requestHandler?: ParameterErrorRequestHandler): ErrorRequestHandler => {

  return (err: unknown, req, res, next) => {
    const _isParameterError = isParameterError(err)
    const _isPostValidationError = isPostValidationError(err)

    if (!_isParameterError && !_isPostValidationError) {
      next(err)
      return
    }

    if (_isParameterError) {
      if (requestHandler) {
        requestHandler(err, req, res, next)
      } else {
        res.status(400).json(err.errorStore.errors)
      }
      return
    }

    if (_isPostValidationError) {
      const store = new ErrorStore()
      const namespaces = req._paramNamespaces ?? {}
      for (const [name, reason] of Object.entries(err.errors)) {
        const namespace = namespaces[name]
        store.add({path: namespace ? `${namespace}.${name}` : name, name, reason})
      }
      const paramErr = new ParameterException(store)
      if (requestHandler) {
        requestHandler(paramErr, req, res, next)
      } else {
        res.status(400).json(store.errors)
      }
    }
  }
}
