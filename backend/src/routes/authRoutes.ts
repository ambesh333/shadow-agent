import { Router } from 'express';
import { getMe, generateNonce, verifySignature, logout } from '../controllers/authController';

const router = Router();

// GET /api/auth/me - Check session / get current user
router.get('/me', getMe);

// POST /api/auth/nonce - Generate authentication challenge
router.post('/nonce', generateNonce);

// POST /api/auth/verify - Verify signature and log in
router.post('/verify', verifySignature);

// POST /api/auth/logout - Clear session
router.post('/logout', logout);

export default router;
