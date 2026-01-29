import { Request, Response } from 'express';
import { prisma, shadowPay } from '../context';
import crypto from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const NONCE_EXPIRY_MINUTES = 5;
const JWT_EXPIRY = '7d';

// GET /api/auth/me - Check session
export const getMe = async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.session_token;

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { walletAddress: string; merchantId: string };

        const merchant = await prisma.merchant.findUnique({
            where: { id: decoded.merchantId }
        });

        if (!merchant) {
            return res.status(401).json({ error: 'Merchant not found' });
        }

        return res.json({
            user: {
                id: merchant.id,
                walletAddress: merchant.walletAddress,
                displayName: merchant.displayName
            }
        });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// POST /api/auth/nonce - Generate challenge nonce
export const generateNonce = async (req: Request, res: Response) => {
    try {
        const { publicKey } = req.body;

        if (!publicKey || typeof publicKey !== 'string') {
            return res.status(400).json({ error: 'publicKey is required' });
        }

        // Generate a random nonce
        const nonce = crypto.randomBytes(32).toString('base64');
        const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000);

        // Store the challenge
        const challenge = await prisma.authChallenge.create({
            data: {
                walletAddress: publicKey,
                nonce,
                expiresAt
            }
        });

        return res.json({
            nonce: challenge.nonce,
            challengeId: challenge.id,
            expiresAt: challenge.expiresAt.toISOString()
        });
    } catch (error) {
        console.error('Nonce generation error:', error);
        return res.status(500).json({ error: 'Failed to generate nonce' });
    }
};

// POST /api/auth/verify - Verify signature and issue JWT
export const verifySignature = async (req: Request, res: Response) => {
    try {
        const { publicKey, signature, message, challengeId } = req.body;

        if (!publicKey || !signature || !message) {
            return res.status(400).json({ error: 'publicKey, signature, and message are required' });
        }

        // Find the challenge
        const challenge = await prisma.authChallenge.findFirst({
            where: challengeId
                ? { id: challengeId, walletAddress: publicKey }
                : { walletAddress: publicKey, used: false }
        });

        if (!challenge) {
            return res.status(401).json({ error: 'Challenge not found' });
        }

        if (challenge.used) {
            return res.status(401).json({ error: 'Challenge already used (replay attack prevention)' });
        }

        if (new Date() > challenge.expiresAt) {
            return res.status(401).json({ error: 'Challenge expired' });
        }

        // Verify the nonce is in the message
        if (!message.includes(challenge.nonce)) {
            return res.status(401).json({ error: 'Nonce mismatch' });
        }

        // Verify the signature using ed25519
        let isValid = false;
        try {
            const messageBytes = new TextEncoder().encode(message);
            const signatureBytes = bs58.decode(signature);
            const publicKeyBytes = bs58.decode(publicKey);

            isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        } catch (e) {
            console.error('Signature verification error:', e);
            return res.status(401).json({ error: 'Invalid signature format' });
        }

        if (!isValid) {
            return res.status(401).json({ error: 'Signature verification failed' });
        }

        // Mark challenge as used
        await prisma.authChallenge.update({
            where: { id: challenge.id },
            data: { used: true }
        });

        // Find or create the merchant
        let merchant = await prisma.merchant.findUnique({
            where: { walletAddress: publicKey }
        });

        if (!merchant) {
            // New signup
            merchant = await prisma.merchant.create({
                data: {
                    walletAddress: publicKey,
                    lastLogin: new Date()
                }
            });
        } else {
            // Existing user - update last login
            merchant = await prisma.merchant.update({
                where: { id: merchant.id },
                data: { lastLogin: new Date() }
            });
        }

        // Issue JWT
        const token = jwt.sign(
            { walletAddress: publicKey, merchantId: merchant.id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        // Set httpOnly cookie
        res.cookie('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.json({
            user: {
                id: merchant.id,
                walletAddress: merchant.walletAddress,
                displayName: merchant.displayName,
                isNewUser: !merchant.displayName
            }
        });
    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ error: 'Verification failed' });
    }
};

// GET /api/auth/logout - Clear session
export const logout = async (req: Request, res: Response) => {
    res.clearCookie('session_token');
    return res.json({ success: true });
};

// GET /api/auth/stats - Get merchant dashboard statistics
export const getMerchantStats = async (req: Request, res: Response) => {
    try {
        const merchantId = (req as any).merchantId;

        if (!merchantId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Fetch funds in escrow (PENDING, DELIVERED, and REFUND_REQUESTED transactions)
        // These are confirmed payments held by facilitator but not yet settled/paid out
        const pendingTransactions = await prisma.transaction.findMany({
            where: {
                merchantId,
                status: { in: ['PENDING', 'DELIVERED', 'REFUND_REQUESTED'] }
            },
            select: { amount: true }
        });
        const escrowBalance = pendingTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        // Fetch active disputes (REFUND_REQUESTED transactions)
        const activeDisputes = await prisma.transaction.count({
            where: {
                merchantId,
                status: 'REFUND_REQUESTED'
            }
        });

        // Fetch total settled sales
        const settledTransactions = await prisma.transaction.findMany({
            where: {
                merchantId,
                status: 'SETTLED'
            },
            select: { amount: true }
        });
        const totalSales = settledTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        // --- NEW: Merchant Resources Analytics ---
        // Fetch all resources for this merchant
        const resources = await prisma.resource.findMany({
            where: { merchantId },
            include: {
                transactions: true // Inefficient for large datasets but simple for now
            }
        });

        // Calculate analytics
        const resourcesAnalytics = resources.map(resource => {
            const accessCount = resource.transactions.length;
            const disputeCount = resource.transactions.filter(tx => tx.status === 'REFUND_REQUESTED').length;

            return {
                id: resource.id,
                title: resource.title,
                type: resource.type,
                accessCount,
                disputeCount
            };
        });

        // Sort by Access Count DESC
        resourcesAnalytics.sort((a, b) => b.accessCount - a.accessCount);

        return res.json({
            escrowBalance,
            activeDisputes,
            totalSales,
            resourcesAnalytics
        });
    } catch (error) {
        console.error('Stats fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
};

// GET /api/auth/disputes - Get active disputes
export const getDisputes = async (req: Request, res: Response) => {
    try {
        const merchantId = (req as any).merchantId;

        if (!merchantId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const disputes = await prisma.transaction.findMany({
            where: {
                merchantId,
                status: 'REFUND_REQUESTED'
            },
            include: {
                resource: {
                    select: { title: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Format for frontend
        const formattedDisputes = disputes.map(tx => ({
            id: tx.id,
            transactionId: tx.id, // Use ID as TX ID or use receiptCode
            receiptCode: tx.receiptCode,
            agentId: tx.agentId,
            amount: tx.amount,
            encryptedReason: tx.encryptedDisputeReason || 'No reason provided',
            resourceName: tx.resource?.title || 'Unknown Resource',
            createdAt: tx.createdAt,
            // AI Decision Fields
            aiDecision: tx.aiDecision,
            aiReasoning: tx.aiReasoning,
            aiConfidence: tx.aiConfidence,
            aiAnalyzedAt: tx.aiAnalyzedAt,
            merchantExplanation: tx.merchantExplanation
        }));

        return res.json({ disputes: formattedDisputes });

    } catch (error) {
        console.error('Disputes fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch disputes' });
    }
};
