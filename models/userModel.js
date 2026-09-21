// models/userModel.js

import { all, get, run } from '../db.js';
import { randomUUID } from 'crypto';

// --- CRUD functions ---

// Get every user.
export const getAllUsers = () => all('SELECT * FROM users');

// Get one user by id (returns undefined if not found).
export const getUserById = (id) =>
  get('SELECT * FROM users WHERE id = ?', [id]);

// Insert a new user. Returns the new row's id.
export const createUser = async ({ name, authName, canEdit = 0, canCreate = 0, canDelete = 0 }) => {
  const id = randomUUID();
  await run(
    'INSERT INTO users (id, name, authName, canEdit, canCreate, canDelete) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, authName, canEdit, canCreate, canDelete]
  );
  return id;
};

// Update a user's fields. Returns number of rows changed.
export const updateUser = async (id, { name, authName, canEdit, canCreate, canDelete }) => {
  const { changes } = await run(
    'UPDATE users SET name = ?, authName = ?, canEdit = ?, canCreate = ?, canDelete = ? WHERE id = ?',
    [name, authName, canEdit, canCreate, canDelete, id]
  );
  return changes;
};

// Delete a user. Returns number of rows deleted.
export const deleteUser = async (id) => {
  const { changes } = await run('DELETE FROM users WHERE id = ?', [id]);
  return changes;
};