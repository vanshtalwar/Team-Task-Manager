import express from 'express';
import { register, login, createAdminUser } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin-users', protect, authorize('admin'), createAdminUser);

export default router;
