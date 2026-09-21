// config/productConfig.js

/**
 * Central configuration for the product service.
 *
 * Rules of thumb:
 *  - Values that encode business policy (limits, defaults, flags) live here.
 *  - Values that encode implementation detail (SQL, table names, file paths)
 *    stay in the layer that owns them.
 */

export const productConfig = {
  // --- Image / upload policy --------------------------------------------
  images: {
    enabled: true,

    // Max number of images allowed per product (existing + new).
    maxPerProduct: 10,

    // MIME types accepted for upload. A Set for O(1) lookups.
    allowedMimeTypes: new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]),

    // Per-file size ceiling, in bytes. (Currently enforced elsewhere or
    // not yet enforced — wire this into the upload middleware.)
    maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB

    // Total size ceiling for a single batch upload, in bytes.
    maxTotalUploadBytes: 15 * 1024 * 1024, // 15 MB

    // When deleting a product, also remove its image files from disk.
    // (DB rows are removed by ON DELETE CASCADE regardless.)
    cleanupOrphanFilesOnDelete: true,

    // When an image insert fails mid-transaction, delete the files that
    // were already written to disk during the failed attempt.
    rollbackFilesOnFailure: true,
  },

  // --- Storage / file locations -----------------------------------------
  storage: {
    // Directory where product images are written, relative to process.cwd().
    // Override in production via env if needed.
    imageDir: process.env.PRODUCT_IMAGE_DIR ?? 'assets/img',
  },

  // --- Listing / pagination ---------------------------------------------
  listing: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  // --- Validation limits (paired with helper/productValidate.js) --------
  validation: {
    nameMinLength: 1,
    nameMaxLength: 200,
    priceMin: 0,
    priceMax: 1_000_000,
    stockMin: 0,
    stockMax: 1_000_000,
    thresholdMin: 0,
    thresholdMax: 1_000_000,
  },

  // --- HTTP status codes used by this service ---------------------------
  // Kept here so the API contract is reviewable in one place.
  http: {
    ok: 200,
    created: 201,
    badRequest: 400,
    notFound: 404,
    unprocessableEntity: 422,
  },

  // --- Error message templates ------------------------------------------
  // Functions where a message depends on runtime values, strings otherwise.
  errors: {
    notFound: 'Not found',
    noFilesUploaded: 'No files uploaded',
    tooManyImages: (existing, limit) =>
      `Too many images: product already has ${existing}, limit is ${limit}`,
    unsupportedFileType: (mime) =>
      `Unsupported file type: ${mime}`,
  },

  // --- Logging / observability ------------------------------------------
  logging: {
    logImageOperations: false,
    auditProductDeletes: false,
  },

  // --- Transaction behavior ---------------------------------------------
  transaction: {
    maxRetries: 0,
    retryDelayMs: 0,
  },
};