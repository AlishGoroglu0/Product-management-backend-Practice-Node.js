import express from 'express';
import * as userController from '../controller/userController.js';

export const Userrouter = express.Router();

Userrouter.get('/',        userController.getAllUsers);
Userrouter.get('/:id',     userController.getUserById);
Userrouter.post('/',       userController.createUser);
Userrouter.put('/:id',     userController.updateUser);
Userrouter.delete('/:id',  userController.deleteUser);