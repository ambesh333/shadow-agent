import { Router } from 'express';
import { getMe, generateNonce, verifySignature, logout, getMerchantStats } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// GET /api/auth/me - Check session / get current user
router.get('/me', getMe);

// GET /api/auth/stats - Get merchant dashboard statistics
router.get('/stats', authMiddleware, getMerchantStats);

// POST /api/auth/nonce - Generate authentication challenge
router.post('/nonce', generateNonce);

// POST /api/auth/verify - Verify signature and log in
router.post('/verify', verifySignature);

// POST /api/auth/logout - Clear session
router.post('/logout', logout);

export default router;
