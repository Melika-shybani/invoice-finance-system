import { Router } from 'express';
import { submitTaxInvoice, getTaxLogs } from '../controllers/taxSimulatorController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

// اندپوینت دریافت صورتحساب توسط شبیه‌ساز مالیاتی (REST API عمومی جهت شبیه‌سازی درگاه مالیاتی)
router.post('/invoices', submitTaxInvoice);

// مشاهده لاگ‌های ارسال صورتحساب به سامانه مالیاتی
router.get('/logs', authenticate, requireRole('admin', 'accountant'), getTaxLogs);

export default router;
