import type {ErrorRequestHandler} from "express"
import {isParameterError} from "../errors/ParameterException.js";
import type {ParameterErrorRequestHandler} from "../types/types.js";

export const errorMiddleware = (requestHandler?: ParameterErrorRequestHandler): ErrorRequestHandler => {

  return (err: unknown, req, res, next) => {
    if (!isParameterError(err)) {
      next(err)
      return
    }

    if (requestHandler) {
      requestHandler(err, req, res, next)
    } else {
      res.status(400).json(err.errorStore.errors)
    }
  }
}
