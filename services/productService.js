// service/productService.js
import * as models from '../models/productModel.js';
import * as ImageStore from './imageStorage.js';
import { validateProduct } from '../helper/productValidate.js';
import { transaction } from '../db.js';
import { productConfig as cfg } from '../config/productConfig.js';

// Small helper so we don't repeat the "build an error with a status" dance.
const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

export const getAllProducts = async () => {
  return await models.getAllProducts();
};

export const getProductById = async (id) => {
  const product = await models.getProductById(id);
  if (!product) {
    throw httpError(cfg.errors.notFound, cfg.http.notFound);
  }
  return product;
};

export const createProduct = async ({ name, price, stock, threshold }) => {
  validateProduct({ name, price, stock, threshold });
  return await models.createProduct({ name, price, stock, threshold });
};

export const updateProduct = async (id, { name, price, stock, threshold }) => {
  validateProduct({ name, price, stock, threshold });
  const changes = await models.updateProduct(id, { name, price, stock, threshold });
  if (!changes) {
    throw httpError(cfg.errors.notFound, cfg.http.notFound);
  }
  return changes;
};

export const deleteProduct = async (id) => {
  // Files must be removed BEFORE the product row.
  // ON DELETE CASCADE removes the image rows, but not the files on disk.
  const product = await models.getProductById(id);
  if (!product) {
    throw httpError(cfg.errors.notFound, cfg.http.notFound);
  }

  if (cfg.images.cleanupOrphanFilesOnDelete) {
    await removeAllProductImages(id);
  }

  const changes = await models.deleteProduct(id);
  if (!changes) {
    throw httpError(cfg.errors.notFound, cfg.http.notFound);
  }
  return changes;
};


// --- Image functions ---

// List images for a product. 404 if the product doesn't exist.
export const getProductImages = async (productId) => {
  const product = await models.getProductById(productId);
  if (!product) {
    throw httpError(cfg.errors.notFound, cfg.http.notFound);
  }
  return models.getImagesByProduct(productId);
};

// Add up to N images to a product. `files` = array of { buffer, mimetype }.
export const addImagesToProduct = async (productId, files) => {
  if (!cfg.images.enabled) {
    throw httpError(cfg.errors.notFound, cfg.http.notFound);
  }

  // 1. Product must exist.
  const product = await models.getProductById(productId);
  if (!product) {
    throw httpError(cfg.errors.notFound, cfg.http.notFound);
  }

  // 2. Basic input checks.
  if (!Array.isArray(files) || files.length === 0) {
    throw httpError(cfg.errors.noFilesUploaded, cfg.http.badRequest);
  }

  // 3. Max-per-product rule (existing + new must not exceed the limit).
  const existing = await models.countImagesByProduct(productId);
  if (existing + files.length > cfg.images.maxPerProduct) {
    throw httpError(
      cfg.errors.tooManyImages(existing, cfg.images.maxPerProduct),
      cfg.http.badRequest
    );
  }

  // 4. Mime check — reject the whole batch if any file is bad.
  for (const f of files) {
    if (!cfg.images.allowedMimeTypes.has(f.mimetype)) {
      throw httpError(
        cfg.errors.unsupportedFileType(f.mimetype),
        cfg.http.badRequest
      );
    }
  }

  // 5. Write files first, then insert rows inside a transaction.
  //    If anything fails, roll back both the DB rows AND the files.
  const written = [];
  try {
    await transaction(async () => {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const filename = await ImageStore.saveImageBuffer(f.buffer, f.mimetype);
        written.push(filename);
        await models.createImage({
          productId,
          filename,
          mime: f.mimetype,
          sortOrder: existing + i,
        });
      }
    });
    return { added: written.length };
  } catch (err) {
    // DB rows already rolled back by transaction(). Clean up the files.
    if (cfg.images.rollbackFilesOnFailure) {
      for (const filename of written) {
        await ImageStore.deleteImageFile(filename).catch(() => {});
      }
    }
    throw err;
  }
};

// Delete one image, checking it belongs to the given product.
export const deleteProductImage = async (productId, imageId) => {
  const image = await models.getImageById(imageId);
  if (!image || image.product_id !== productId) {
    throw httpError(cfg.errors.notFound, cfg.http.notFound);
  }
  await models.deleteImage(imageId);
  await ImageStore.deleteImageFile(image.filename);
  return { deleted: 1 };
};

// Internal: delete all image files for a product.
// Used before deleting the product itself (cascade only removes DB rows).
export const removeAllProductImages = async (productId) => {
  const images = await models.getImagesByProduct(productId);
  for (const img of images) {
    await ImageStore.deleteImageFile(img.filename).catch(() => {});
  }
};