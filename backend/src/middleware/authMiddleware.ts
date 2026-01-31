import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Auth middleware to verify JWT and attach merchantId to request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        let token = req.cookies?.session_token;

        // Fallback: Check Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
            walletAddress: string;
            merchantId: string
        };

        // Attach merchantId to request for use in controllers
        (req as any).merchantId = decoded.merchantId;
        (req as any).walletAddress = decoded.walletAddress;

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
