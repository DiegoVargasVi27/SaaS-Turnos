export type CatalogErrorCode =
  | "CATALOG_BUSINESS_NOT_FOUND"
  | "CATALOG_SERVICE_NOT_FOUND"
  | "CATALOG_SERVICE_HAS_APPOINTMENTS"
  | "CATALOG_INVALID_SERVICE_DATA";

export class CatalogError extends Error {
  constructor(public readonly code: CatalogErrorCode, message: string) {
    super(message);
  }
}
