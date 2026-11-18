import { Router } from 'express';
import {
  listJournalEntries,
  getJournalEntry,
  createJournalEntry,
  deleteJournalEntry,
} from '../controllers/journalController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'accountant'));

router.get('/', listJournalEntries);
router.get('/:id', getJournalEntry);
router.post('/', createJournalEntry);
router.delete('/:id', deleteJournalEntry);

export default router;
