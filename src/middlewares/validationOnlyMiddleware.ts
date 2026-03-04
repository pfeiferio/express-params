import {isValidationOnlyException} from "../errors/ValidationOnlyException.js";
import type {ErrorRequestHandler} from "express"
import type {ValidationOnlyRequestHandler} from "../types/types.js";

export const validationOnlyMiddleware =
  (requestHandler?: ValidationOnlyRequestHandler): ErrorRequestHandler => {
    return (err: unknown, req, res, next) => {
      if (!isValidationOnlyException(err)) {
        next(err)
        return
      }

      if (requestHandler) {
        requestHandler(err, req, res, next)
      } else {
        res.status(200).json({valid: true, data: err.data})
      }
    }
  }
