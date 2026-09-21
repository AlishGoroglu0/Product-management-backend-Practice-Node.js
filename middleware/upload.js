// middleware/upload.js
// Responsibility: parse multipart/form-data and hand the controller
// an array of { buffer, mimetype } objects. No DB, no business rules.

import multer from 'multer';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED.has(file.mimetype)) {
    const err = new Error(`Unsupported file type: ${file.mimetype}`);
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

// Use as: router.post('/:id/images', upload.array('images', 5), controller)
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});


// Express error handler — must have 4 args to be recognized as one.
// Place it LAST in server.js (after all routes).
export const uploadErrorHandler = (err, req, res, next) => {
  if (!err) return next();

  // Multer's own error codes
  const multerCodes = new Set([
    'LIMIT_FILE_SIZE',
    'LIMIT_FILE_COUNT',
    'LIMIT_UNEXPECTED_FILE',
    'LIMIT_PART_COUNT',
    'LIMIT_FIELD_KEY',
    'LIMIT_FIELD_VALUE',
    'LIMIT_FIELD_COUNT',
  ]);

  if (multerCodes.has(err.code)) {
    return res.status(400).json({ error: err.message });
  }

  // Our fileFilter rejection (already has .status = 400)
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Not a multer error — pass it on to the next error handler
  next(err);
};