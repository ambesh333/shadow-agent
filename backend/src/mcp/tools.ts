/**
 * MCP Tools for Shadow Agent
 * Exposes x402 payment gateway functionality as MCP tools
 */
import { z } from 'zod';
import { prisma } from '../context';
import { calculateResourceScore, calculateMerchantScore, getScoreLabel } from '../utils/scoring';

/**
 * Tool: list_resources
 * Lists all available resources in the marketplace with trust scores
 */
export const listResourcesTool = {
    name: 'list_resources',
    description: 'List all active resources available in the Shadow Agent marketplace. Returns resources with trust scores to help evaluate reliability. Use this to discover what paid resources are available.',
    inputSchema: z.object({
        limit: z.number().optional().describe('Maximum number of resources to return (default: 50)'),
        minTrustScore: z.number().optional().describe('Minimum trust score filter (0-100)')
    }),
    execute: async (args: { limit?: number; minTrustScore?: number }) => {
        const limit = args.limit || 50;
        const minScore = args.minTrustScore || 0;

        const resources = await prisma.resource.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                transactions: { select: { status: true } },
                merchant: {
                    select: {
                        id: true,
                        createdAt: true,
                        resources: { select: { id: true } },
                        transactions: { select: { amount: true, status: true } }
                    }
                }
            }
        });

        const resourcesWithScores = resources.map(resource => {
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

            return {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                type: resource.type,
                price: resource.price,
                network: resource.network,
                token: resource.token,
                trustScore: Math.round(resourceScore),
                trustLabel: getScoreLabel(resourceScore).label
            };
        }).filter(r => r.trustScore >= minScore);

        resourcesWithScores.sort((a, b) => b.trustScore - a.trustScore);

        return {
            resources: resourcesWithScores,
            count: resourcesWithScores.length,
            accessEndpoint: '/api/gateway/resource/{id}'
        };
    }
};

/**
 * Tool: get_resource
 * Get detailed information about a specific resource
 */
export const getResourceTool = {
    name: 'get_resource',
    description: 'Get detailed information about a specific resource including pricing, trust score, and access instructions. Use this before purchasing to understand what you are buying.',
    inputSchema: z.object({
        resourceId: z.string().describe('The unique ID of the resource to fetch')
    }),
    execute: async (args: { resourceId: string }) => {
        const resource = await prisma.resource.findFirst({
            where: { id: args.resourceId, isActive: true },
            include: {
                transactions: { select: { status: true } },
                merchant: {
                    select: {
                        id: true,
                        createdAt: true,
                        resources: { select: { id: true } },
                        transactions: { select: { amount: true, status: true } }
                    }
                }
            }
        });

        if (!resource) {
            return { error: 'Resource not found', resourceId: args.resourceId };
        }

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
            resource: {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                type: resource.type,
                price: resource.price,
                network: resource.network,
                token: resource.token,
                autoApprovalMinutes: resource.autoApprovalMinutes,
                trustScore: Math.round(resourceScore),
                trustLabel: scoreLabel.label
            },
            payment: {
                required: resource.price > 0,
                amount: resource.price,
                token: resource.token,
                instructions: 'To access this resource, make a Solana transaction to the facilitator wallet and include the X-Payment header with your transaction signature when calling the access endpoint.'
            },
            accessEndpoint: `/api/gateway/resource/${resource.id}`
        };
    }
};

/**
 * Tool: get_payment_info
 * Get payment information required to access a resource
 */
export const getPaymentInfoTool = {
    name: 'get_payment_info',
    description: 'Get the payment information required to access a resource. Returns the facilitator wallet address, required amount, and how to structure the X-Payment header for the x402 protocol.',
    inputSchema: z.object({
        resourceId: z.string().describe('The unique ID of the resource')
    }),
    execute: async (args: { resourceId: string }) => {
        const resource = await prisma.resource.findFirst({
            where: { id: args.resourceId, isActive: true },
            include: {
                merchant: {
                    select: { walletAddress: true }
                }
            }
        });

        if (!resource) {
            return { error: 'Resource not found', resourceId: args.resourceId };
        }

        const facilitatorWallet = process.env.FACILITATOR_WALLET_ADDRESS;

        return {
            resourceId: resource.id,
            price: resource.price,
            token: resource.token,
            network: resource.network,
            facilitatorWallet,
            paymentHeader: {
                format: 'X-Payment header JSON structure',
                example: {
                    version: 1,
                    scheme: 'shadowwire',
                    payload: {
                        tx_signature: '<your_solana_transaction_signature>',
                        sender: '<your_wallet_address>',
                        recipient: facilitatorWallet,
                        amount: resource.price,
                        token: resource.token,
                        timestamp: Date.now()
                    }
                }
            },
            accessEndpoint: `/api/gateway/resource/${resource.id}`,
            settleEndpoint: '/api/gateway/settle'
        };
    }
};

/**
 * Tool: settle_transaction
 * Settle or dispute a completed transaction
 */
export const settleTransactionTool = {
    name: 'settle_transaction',
    description: 'Settle or dispute a transaction after receiving resource content. Use "settled" if satisfied with the resource, or "disputed" with a reason if there are issues. Disputes are reviewed by AI and the merchant.',
    inputSchema: z.object({
        transactionId: z.string().describe('The transaction ID received after payment'),
        receiptCode: z.string().describe('The receipt code received with the resource'),
        outcome: z.enum(['settled', 'disputed']).describe('Settle if satisfied, dispute if there are issues'),
        reason: z.string().optional().describe('Required if disputing - explain what was wrong with the resource')
    }),
    execute: async (args: { transactionId: string; receiptCode: string; outcome: 'settled' | 'disputed'; reason?: string }) => {
        const transaction = await prisma.transaction.findUnique({
            where: { id: args.transactionId },
            include: { resource: true }
        });

        if (!transaction) {
            return { error: 'Transaction not found', transactionId: args.transactionId };
        }

        if (transaction.receiptCode !== args.receiptCode) {
            return { error: 'Invalid receipt code' };
        }

        if (transaction.status !== 'PENDING') {
            return { error: `Transaction already ${transaction.status.toLowerCase()}`, currentStatus: transaction.status };
        }

        if (args.outcome === 'disputed' && !args.reason) {
            return { error: 'Reason is required when disputing a transaction' };
        }

        // Note: Actual settlement/refund logic is handled by the gateway controller
        // This tool provides the interface for MCP clients
        return {
            message: `To complete this ${args.outcome === 'settled' ? 'settlement' : 'dispute'}, call the settle endpoint`,
            endpoint: '/api/gateway/settle',
            method: 'POST',
            body: {
                transactionId: args.transactionId,
                receiptCode: args.receiptCode,
                outcome: args.outcome,
                ...(args.reason && { reason: args.reason })
            }
        };
    }
};

// Export all tools as an array for easy registration
export const allTools = [
    listResourcesTool,
    getResourceTool,
    getPaymentInfoTool,
    settleTransactionTool
];
