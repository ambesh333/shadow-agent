import { Router } from 'express';
import * as GatewayController from '../controllers/gatewayController';

const router = Router();

// x402 Gateway - Publicly accessible for agents
router.get('/resource/:resourceId', GatewayController.accessResource);

export default router;
