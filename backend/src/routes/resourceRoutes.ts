import { Router } from 'express';
import {
    listResources,
    getResource,
    createResource,
    updateResource,
    deleteResource
} from '../controllers/resourceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/resources - List all resources for merchant
router.get('/', listResources);

// GET /api/resources/:id - Get single resource
router.get('/:id', getResource);

// POST /api/resources - Create new resource
router.post('/', createResource);

// PATCH /api/resources/:id - Update resource
router.patch('/:id', updateResource);

// DELETE /api/resources/:id - Delete resource
router.delete('/:id', deleteResource);

export default router;
