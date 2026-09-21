// routes/receiptRouter.js
// Responsibility: map HTTP verb + path to a controller function.

import express from 'express';
import * as receiptController from '../controller/receiptController.js';

export const Receiptrouter = express.Router();

Receiptrouter.get('/',           receiptController.getAllReceipts);
Receiptrouter.get('/:id',        receiptController.getReceiptById);
Receiptrouter.post('/',          receiptController.createReceipt);
Receiptrouter.patch('/:id/void', receiptController.voidReceipt);
Receiptrouter.delete('/:id',     receiptController.deleteReceipt);