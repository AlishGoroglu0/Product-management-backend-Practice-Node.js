// controller/userController.js
import * as UserService from "../services/userService.js";

// GET /users
export const getAllUsers = async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// GET /users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// POST /users
export const createUser = async (req, res) => {
  try {
    const id = await UserService.createUser(req.body);
    res.status(201).json({ id });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// PUT /users/:id
export const updateUser = async (req, res) => {
  try {
    const changes = await UserService.updateUser(req.params.id, req.body);
    res.json({ updated: changes });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// DELETE /users/:id
export const deleteUser = async (req, res) => {
  try {
    await UserService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};