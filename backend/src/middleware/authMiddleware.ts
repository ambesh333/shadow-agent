import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Auth middleware to verify JWT and attach merchantId to request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        let token = req.cookies?.session_token;

        // Log auth attempt details
        console.log(`[Auth] Request: ${req.method} ${req.path}`);
        console.log(`[Auth] Cookies present:`, !!req.cookies?.session_token);
        console.log(`[Auth] Authorization Header:`, req.headers.authorization ? 'Present' : 'Missing');

        // Fallback: Check Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
                console.log('[Auth] Using Bearer token from header');
            }
        }

        if (!token) {
            console.warn('[Auth] Failed: No token found in cookies or headers');
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
            walletAddress: string;
            merchantId: string
        };

        console.log(`[Auth] Success: Wallet ${decoded.walletAddress}`);

        // Attach merchantId to request for use in controllers
        (req as any).merchantId = decoded.merchantId;
        (req as any).walletAddress = decoded.walletAddress;

        next();
    } catch (error) {
        console.error('[Auth] Token verification failed:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
