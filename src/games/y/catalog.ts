import { createXYCatalog, xyCatalogRules } from '../xy/catalog.ts'

export const yCatalogRules = xyCatalogRules('y')
export const yCatalog = createXYCatalog(yCatalogRules)
