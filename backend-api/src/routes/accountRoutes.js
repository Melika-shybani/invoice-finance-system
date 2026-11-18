import { Router } from 'express';
import {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../controllers/accountController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin', 'accountant'), listAccounts);
router.get('/:id', requireRole('admin', 'accountant'), getAccount);
router.post('/', requireRole('admin', 'accountant'), createAccount);
router.put('/:id', requireRole('admin', 'accountant'), updateAccount);
router.delete('/:id', requireRole('admin'), deleteAccount);

export default router;
