// service/userService.js
import * as models from '../models/userModel.js';

export const getAllUsers = async () => {
  return await models.getAllUsers();
};

export const getUserById = async (id) => {
  const user = await models.getUserById(id);
  if (!user) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return user;
};

export const createUser = async ({ name, authName, canEdit, canCreate, canDelete }) => {
  if (typeof name !== 'string' || typeof authName !== 'string') {
    const err = new Error('name (string) and authName (string) are required');
    err.status = 400;
    throw err;
  }
  return await models.createUser({ name, authName, canEdit, canCreate, canDelete });
};

export const updateUser = async (id, { name, authName, canEdit, canCreate, canDelete }) => {
  if (typeof name !== 'string' || typeof authName !== 'string') {
    const err = new Error('name (string) and authName (string) are required');
    err.status = 400;
    throw err;
  }
  const changes = await models.updateUser(id, { name, authName, canEdit, canCreate, canDelete });
  if (!changes) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return changes;
};

export const deleteUser = async (id) => {
  const changes = await models.deleteUser(id);
  if (!changes) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return changes;
};