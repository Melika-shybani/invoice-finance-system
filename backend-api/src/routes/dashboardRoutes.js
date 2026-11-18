import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getDashboard);

export default router;
