// controller/productController.js
import * as Productservice from "../services/productService.js";

// GET /products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Productservice.getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// GET /products/:id
export const getProductById = async (req, res) => {
  try {
    const product = await Productservice.getProductById(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// POST /products
export const createProduct = async (req, res) => {
  try {
    const id = await Productservice.createProduct(req.body);
    res.status(201).json({ id });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// PUT /products/:id
export const updateProduct = async (req, res) => {
  try {
    const changes = await Productservice.updateProduct(req.params.id, req.body);
    res.json({ updated: changes });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// DELETE /products/:id
export const deleteProduct = async (req, res) => {
  try {
    await Productservice.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};


// GET /products/:id/images
export const listProductImages = async (req, res) => {
  try {
    const images = await Productservice.getProductImages(req.params.id);
    res.json(images);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// POST /products/:id/images   (multipart, field name: "images")
export const uploadProductImages = async (req, res) => {
  try {
    const result = await Productservice.addImagesToProduct(
      req.params.id,
      req.files || []
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// DELETE /products/:id/images/:imageId
export const deleteProductImage = async (req, res) => {
  try {
    await Productservice.deleteProductImage(req.params.id, req.params.imageId);
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};