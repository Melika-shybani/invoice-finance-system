import { Router } from 'express';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
} from '../controllers/userController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

// فقط مدیر سیستم دسترسی به مدیریت کاربران دارد
router.use(authenticate, requireRole('admin'));

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/toggle-status', toggleUserStatus);
router.delete('/:id', deleteUser);

export default router;
