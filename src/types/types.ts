import type {NextFunction, Request, Response} from "express"
import {ValidationOnlyException} from "../errors/ValidationOnlyException.js";
import {ParameterException} from "../errors/ParameterException.js";

export type ResolvedSearchData = Record<string, Record<string, unknown>>
export type ResolveSearchData = (request: Request) => ResolvedSearchData

export type ValidationOnlyRequestHandler =
  (err: ValidationOnlyException, req: Request, res: Response, next: NextFunction) => unknown

export type ParameterErrorRequestHandler =
  (err: ParameterException, req: Request, res: Response, next: NextFunction) => unknown
