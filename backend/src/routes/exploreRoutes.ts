import { Router } from 'express';
import {
    listAllPublicResources,
    getPublicResource,
    accessResource
} from '../controllers/publicResourceController';

const router = Router();

// PUBLIC routes - No authentication required
// These are for AI agents to browse and access resources

// GET /api/explore - List all active resources from all merchants
router.get('/', listAllPublicResources);

// GET /api/explore/:id - Get a single resource details (without content)
router.get('/:id', getPublicResource);

// GET /api/explore/:id/access - Access resource content (x402 payment required)
router.get('/:id/access', accessResource);

export default router;
