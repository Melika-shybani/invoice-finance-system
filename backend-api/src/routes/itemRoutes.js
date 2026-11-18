import { Router } from 'express';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
} from '../controllers/itemController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listItems);
router.get('/:id', getItem);
router.post('/', requireRole('admin', 'accountant'), createItem);
router.put('/:id', requireRole('admin', 'accountant'), updateItem);
router.delete('/:id', requireRole('admin'), deleteItem);

export default router;
