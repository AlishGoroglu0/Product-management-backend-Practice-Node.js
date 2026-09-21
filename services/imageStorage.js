// services/imageStorage.js
// Responsibility: write/delete image files on disk. No DB, no HTTP.

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { productConfig as cfg } from '../config/productConfig.js';

const IMG_DIR = path.resolve(cfg.storage.imageDir);

// Extension lookup is derived from the allowed mime types, so adding a new
// format in config only requires one entry here.
const EXT_FOR_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

// Extension for a given mime. We do NOT trust the client's filename.
export const extForMime = (mime) => EXT_FOR_MIME[mime] ?? null;

// Make sure the folder exists (safe to call repeatedly).
export const ensureImgDir = async () => {
  await fs.mkdir(IMG_DIR, { recursive: true });
};

// Save a buffer to disk with a fresh UUID name. Returns the filename.
export const saveImageBuffer = async (buffer, mime) => {
  const ext = extForMime(mime);
  if (!ext) throw new Error(`Unsupported mime: ${mime}`);
  const filename = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(IMG_DIR, filename), buffer);
  return filename;
};

// Delete a file. Ignores ENOENT (already gone is fine).
export const deleteImageFile = async (filename) => {
  try {
    await fs.unlink(path.join(IMG_DIR, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
};

// Absolute path for a filename (in case anything needs it).
export const imgPath = (filename) => path.join(IMG_DIR, filename);