import express from 'express';
import * as productController from '../controller/productController.js';

export const Productrouter = express.Router();

Productrouter.get('/',        productController.getAllProducts);
Productrouter.get('/:id',     productController.getProductById);
Productrouter.post('/',       productController.createProduct);
Productrouter.put('/:id',     productController.updateProduct);
Productrouter.delete('/:id',  productController.deleteProduct);