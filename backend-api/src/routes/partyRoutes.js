import { Router } from 'express';
import {
  listParties,
  getParty,
  createParty,
  updateParty,
  deleteParty,
  getPartyStatement,
} from '../controllers/partyController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listParties);
router.get('/:id', getParty);
router.get('/:id/statement', getPartyStatement);
router.post('/', requireRole('admin', 'accountant', 'sales'), createParty);
router.put('/:id', requireRole('admin', 'accountant'), updateParty);
router.delete('/:id', requireRole('admin'), deleteParty);

export default router;
