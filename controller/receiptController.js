// controller/receiptController.js
// Responsibility: HTTP only. Read req, call service, send res.

import * as Receiptservice from '../services/receiptService.js';

// GET /receipts
export const getAllReceipts = async (req, res) => {
  try {
    const receipts = await Receiptservice.getAllReceipts();
    res.json(receipts);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// GET /receipts/:id
export const getReceiptById = async (req, res) => {
  try {
    const receipt = await Receiptservice.getReceiptById(req.params.id);
    res.json(receipt);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// POST /receipts
export const createReceipt = async (req, res) => {
  try {
    const receipt = await Receiptservice.createReceipt(req.body);
    res.status(201).json(receipt);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// DELETE /receipts/:id  (voids, does not delete)
export const voidReceipt = async (req, res) => {
  try {
    const receipt = await Receiptservice.voidReceipt(req.params.id);
    res.json(receipt);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// DELETE /receipts/:id   (hard delete — removes the row)
export const deleteReceipt = async (req, res) => {
  try {
    await Receiptservice.deleteReceipt(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};