import { Router } from 'express';
import {
  listPayments,
  getPayment,
  createPayment,
  deletePayment,
} from '../controllers/paymentController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'accountant'));

router.get('/', listPayments);
router.get('/:id', getPayment);
router.post('/', createPayment);
router.delete('/:id', deletePayment);

export default router;
