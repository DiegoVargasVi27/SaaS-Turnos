export type CatalogErrorCode =
  | "CATALOG_BUSINESS_NOT_FOUND"
  | "CATALOG_SERVICE_NOT_FOUND";

export class CatalogError extends Error {
  constructor(public readonly code: CatalogErrorCode, message: string) {
    super(message);
  }
}
