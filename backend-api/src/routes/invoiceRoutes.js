import { Router } from 'express';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  validateInvoice,
  markReady,
  sendInvoiceToTax,
  amendInvoice,
  cancelInvoice,
} from '../controllers/invoiceController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listInvoices);
router.get('/:id', getInvoice);
router.post('/', requireRole('admin', 'accountant', 'sales'), createInvoice);
router.put('/:id', requireRole('admin', 'accountant', 'sales'), updateInvoice);
router.delete('/:id', requireRole('admin', 'accountant', 'sales'), deleteInvoice);

// عملیات صورتحساب الکترونیکی
router.post('/:id/validate', requireRole('admin', 'accountant', 'sales'), validateInvoice);
router.post('/:id/ready', requireRole('admin', 'accountant'), markReady);
router.post('/:id/send', requireRole('admin', 'accountant'), sendInvoiceToTax);
router.post('/:id/amend', requireRole('admin', 'accountant'), amendInvoice);
router.post('/:id/cancel', requireRole('admin', 'accountant'), cancelInvoice);

export default router;
