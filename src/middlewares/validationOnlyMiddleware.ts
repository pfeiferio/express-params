import {ValidationOnlyException} from "../errors/ValidationOnlyException.js";
import type {ErrorRequestHandler} from "express"


export const validationOnlyMiddleware = (): ErrorRequestHandler => {
  return (err: unknown, _req, res, next) => {
    if (err instanceof ValidationOnlyException) {
      res.status(200).json({valid: true, data: err.data})
      return
    }
    next(err)
  }
}
