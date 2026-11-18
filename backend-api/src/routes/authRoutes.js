import { Router } from 'express';
import { login, getMe, register } from '../controllers/authController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/register', authenticate, requireRole('admin'), register);

export default router;
