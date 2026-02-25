import type {Request} from "express"

export type ResolvedSearchData = Record<string, Record<string, unknown>>
export type ResolveSearchData = (request: Request) => ResolvedSearchData
