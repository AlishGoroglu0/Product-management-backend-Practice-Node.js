// routes/imageRouter.js
import express from 'express';
import { upload } from '../middleware/upload.js';
import * as productController from '../controller/productController.js';
import { productConfig as cfg } from '../config/productConfig.js';

export const imageRouter = express.Router();

imageRouter.get('/:id/images', productController.listProductImages);

imageRouter.post(
  '/:id/images',
  upload.array('images', cfg.images.maxPerProduct),
  productController.uploadProductImages
);

imageRouter.delete('/:id/images/:imageId', productController.deleteProductImage);