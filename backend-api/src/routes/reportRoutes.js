import { Router } from 'express';
import {
  getSalesReport,
  getPurchasesReport,
  getPartyBalances,
  getTrialBalance,
  getProfitLoss,
  getJournalReport,
  exportExcelReport,
  exportCSVReport,
} from '../controllers/reportController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'accountant'));

router.get('/sales', getSalesReport);
router.get('/purchases', getPurchasesReport);
router.get('/balances', getPartyBalances);
router.get('/trial-balance', getTrialBalance);
router.get('/profit-loss', getProfitLoss);
router.get('/journal', getJournalReport);

// خروجی‌های فایل گزارش‌ها
router.get('/export/excel', exportExcelReport);
router.get('/export/csv', exportCSVReport);

export default router;
