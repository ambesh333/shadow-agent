import { Request, Response } from 'express';
import { prisma } from '../context';
import { calculateResourceScore, calculateMerchantScore, getScoreLabel } from '../utils/scoring';

/**
 * GET /api/explore
 * List all active resources from all merchants (public, for AI agents)
 * Privacy-first: No merchant details exposed, but includes trust score
 */
export const listAllPublicResources = async (req: Request, res: Response) => {
    try {
        // Fetch resources with transaction data for scoring
        const resources = await prisma.resource.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            include: {
                transactions: {
                    select: {
                        status: true
                    }
                },
                merchant: {
                    select: {
                        id: true,
                        createdAt: true,
                        resources: {
                            select: { id: true }
                        },
                        transactions: {
                            select: {
                                amount: true,
                                status: true
                            }
                        }
                    }
                }
            }
        });

        // Calculate scores for each resource
        const resourcesWithScores = resources.map(resource => {
            // Calculate merchant score first
            const merchantTotalTransactions = resource.merchant.transactions.length;
            const merchantLostDisputes = resource.merchant.transactions.filter(tx => tx.status === 'REFUNDED').length;
            const merchantTotalEarnings = resource.merchant.transactions
                .filter(tx => tx.status === 'SETTLED')
                .reduce((sum, tx) => sum + tx.amount, 0);

            const merchantScore = calculateMerchantScore({
                resourceCount: resource.merchant.resources.length,
                totalEarnings: merchantTotalEarnings,
                totalTransactions: merchantTotalTransactions,
                lostDisputes: merchantLostDisputes,
                createdAt: resource.merchant.createdAt
            });

            // Calculate resource score
            const totalTransactions = resource.transactions.length;
            const settledDisputes = resource.transactions.filter(tx => tx.status === 'REFUNDED').length;
            const activeDisputes = resource.transactions.filter(tx => tx.status === 'REFUND_REQUESTED').length;

            const resourceScore = calculateResourceScore({
                accessCount: totalTransactions,
                settledDisputes,
                activeDisputes,
                merchantScore,
                createdAt: resource.createdAt,
                totalTransactions
            });

            const scoreLabel = getScoreLabel(resourceScore);

            return {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                type: resource.type,
                price: resource.price,
                network: resource.network,
                token: resource.token,
                isActive: resource.isActive,
                createdAt: resource.createdAt,
                trustScore: resourceScore,
                trustLabel: scoreLabel.label
            };
        });

        // Sort by trust score (highest first) as secondary sort
        resourcesWithScores.sort((a, b) => b.trustScore - a.trustScore);

        return res.json({
            resources: resourcesWithScores,
            count: resourcesWithScores.length,
            endpoint: {
                access: '/api/explore/{id}/access',
                details: '/api/explore/{id}'
            }
        });
    } catch (error) {
        console.error('List public resources error:', error);
        return res.status(500).json({ error: 'Failed to fetch resources' });
    }
};

/**
 * GET /api/explore/:id
 * Get a single resource details (public, for AI agents)
 * Privacy-first: No merchant details exposed, includes trust score
 */
export const getPublicResource = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const resource = await prisma.resource.findFirst({
            where: { id, isActive: true },
            include: {
                transactions: {
                    select: { status: true }
                },
                merchant: {
                    select: {
                        id: true,
                        createdAt: true,
                        resources: { select: { id: true } },
                        transactions: {
                            select: { amount: true, status: true }
                        }
                    }
                }
            }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Calculate merchant score
        const merchantTotalTransactions = resource.merchant.transactions.length;
        const merchantLostDisputes = resource.merchant.transactions.filter(tx => tx.status === 'REFUNDED').length;
        const merchantTotalEarnings = resource.merchant.transactions
            .filter(tx => tx.status === 'SETTLED')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const merchantScore = calculateMerchantScore({
            resourceCount: resource.merchant.resources.length,
            totalEarnings: merchantTotalEarnings,
            totalTransactions: merchantTotalTransactions,
            lostDisputes: merchantLostDisputes,
            createdAt: resource.merchant.createdAt
        });

        // Calculate resource score
        const totalTransactions = resource.transactions.length;
        const settledDisputes = resource.transactions.filter(tx => tx.status === 'REFUNDED').length;
        const activeDisputes = resource.transactions.filter(tx => tx.status === 'REFUND_REQUESTED').length;

        const resourceScore = calculateResourceScore({
            accessCount: totalTransactions,
            settledDisputes,
            activeDisputes,
            merchantScore,
            createdAt: resource.createdAt,
            totalTransactions
        });

        const scoreLabel = getScoreLabel(resourceScore);

        return res.json({
            resource: {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                type: resource.type,
                price: resource.price,
                network: resource.network,
                token: resource.token,
                autoApprovalMinutes: resource.autoApprovalMinutes,
                createdAt: resource.createdAt,
                trustScore: resourceScore,
                trustLabel: scoreLabel.label
            },
            payment: {
                required: resource.price > 0,
                amount: resource.price,
                token: resource.token,
                accessEndpoint: `/api/explore/${id}/access`
            }
        });
    } catch (error) {
        console.error('Get public resource error:', error);
        return res.status(500).json({ error: 'Failed to fetch resource' });
    }
};

/**
 * GET /api/explore/:id/access
 * Access resource content - returns 402 if payment required
 * AI agents include X-Payment header with ZK proof
 */
export const accessResource = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const paymentHeader = req.headers['x-payment'];

        const resource = await prisma.resource.findFirst({
            where: { id, isActive: true },
            include: {
                merchant: {
                    select: {
                        walletAddress: true
                    }
                }
            }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // If resource has a price and no payment provided, return 402
        // Note: We need merchant wallet internally for payment routing, but don't expose it in list/details
        if (resource.price > 0 && !paymentHeader) {
            res.setHeader('X-Payment-Required', 'true');
            res.setHeader('X-Payment-Amount', Math.floor(resource.price * 1_000_000_000).toString()); // lamports
            res.setHeader('X-Payment-Token', resource.token);
            res.setHeader('X-Payment-Network', resource.network);
            res.setHeader('X-Resource-ID', resource.id);

            return res.status(402).json({
                error: 'Payment required',
                payment: {
                    amount: resource.price,
                    amountLamports: Math.floor(resource.price * 1_000_000_000),
                    token: resource.token,
                    network: resource.network
                },
                instructions: 'Use POST /api/gateway/pay with resourceId to purchase this resource'
            });
        }

        // If payment header provided, we need to verify it
        // For now, we redirect to the gateway for proper verification
        if (paymentHeader) {
            // The gateway handles payment verification
            // This endpoint is mainly for discovery - actual access goes through gateway
            return res.json({
                message: 'Use /api/gateway/pay for payment verification and resource access',
                resourceId: resource.id
            });
        }

        // Free resource - return content directly
        const content: any = {
            id: resource.id,
            title: resource.title,
            description: resource.description,
            type: resource.type
        };

        if (resource.type === 'IMAGE') {
            content.imageData = resource.imageData;
        } else {
            content.url = resource.url;
        }

        return res.json({ content });
    } catch (error) {
        console.error('Access resource error:', error);
        return res.status(500).json({ error: 'Failed to access resource' });
    }
};
