// helper/productValidate.js
import { productConfig as cfg } from '../config/productConfig.js';

const isNumber = (v) => Number.isFinite(v);

export const validateProduct = ({ name, price, stock, threshold } = {}) => {
  const errors = [];
  const v = cfg.validation;
  const { nameMinLength, nameMaxLength, priceMin, priceMax, stockMin, stockMax, thresholdMin, thresholdMax } = v;

  if (typeof name !== 'string' || name.trim().length < nameMinLength) {
    errors.push(`name must be a non-empty string`);
  } else if (name.trim().length > nameMaxLength) {
    errors.push(`name must be at most ${nameMaxLength} characters`);
  }

  if (!isNumber(price) || price < priceMin || price > priceMax) {
    errors.push(`price must be a number between ${priceMin} and ${priceMax}`);
  }
  if (!isNumber(stock) || stock < stockMin || stock > stockMax) {
    errors.push(`stock must be a number between ${stockMin} and ${stockMax}`);
  }
  if (!isNumber(threshold) || threshold < thresholdMin || threshold > thresholdMax) {
    errors.push(`threshold must be a number between ${thresholdMin} and ${thresholdMax}`);
  }

  if (errors.length) {
    const err = new Error(errors.join(', '));
    err.status = cfg.http.badRequest;
    throw err;
  }
};