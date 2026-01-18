import { Router } from 'express';
import * as EscrowController from '../controllers/escrowController';

const router = Router();

// Gateway
router.get('/gateway/:merchantId/:sku', EscrowController.getPremiumData);

// Transaction Flow
router.post('/pay/escrow', EscrowController.initEscrow);
router.post('/settle', EscrowController.settleTransaction);
router.post('/dispute', EscrowController.disputeTransaction);

// Merchant Admin
router.post('/admin/resolve', EscrowController.resolveDispute);

export default router;
