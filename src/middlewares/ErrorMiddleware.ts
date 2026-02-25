import type {ErrorRequestHandler} from "express"
import {ParameterException} from "../errors/ParameterException.js";

export const errorMiddleware = (): ErrorRequestHandler => {

  return (err: unknown, _req, res, next) => {
    if (!(err instanceof ParameterException)) {
      next(err)
      return
    }

    res.status(400).json(err.errorStore.errors)
  }
}
