import { Router } from 'express';
import * as GatewayController from '../controllers/gatewayController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// x402 Gateway - Publicly accessible for agents
router.get('/resource/:resourceId', GatewayController.accessResource);
router.post('/settle', GatewayController.settleTransaction);

// Merchant dispute resolution - Requires auth
router.post('/resolve-dispute', authMiddleware, GatewayController.resolveDispute);

export default router;
