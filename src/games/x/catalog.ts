import { createXYCatalog, xyCatalogRules } from '../xy/catalog.ts'

export const xCatalogRules = xyCatalogRules('x')
export const xCatalog = createXYCatalog(xCatalogRules)
