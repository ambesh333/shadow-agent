/**
 * MCP Tools for Shadow Agent
 * Exposes x402 payment gateway functionality as MCP tools
 */
import { z } from 'zod';
import { ShadowWireClient } from '@radr/shadowwire';
import { prisma } from '../context';
import { calculateResourceScore, calculateMerchantScore, getScoreLabel } from '../utils/scoring';

const LAMPORTS_PER_SOL = 1_000_000_000;

function resolveShadowWireApiBase(override?: string): string {
    const base = (override || process.env.SHADOWWIRE_API_URL || process.env.SHADOWPAY_API_URL || 'https://shadow.radr.fun/shadowpay/api').trim();
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

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
 * Tool: deposit_to_pool
 * Create an unsigned deposit transaction for the ShadowWire pool
 */
export const depositToPoolTool = {
    name: 'deposit_to_pool',
    description: 'Create an unsigned transaction to deposit SOL into the ShadowWire pool. The client must sign and submit the transaction on-chain.',
    inputSchema: z.object({
        wallet: z.string().describe('Solana wallet address to deposit from'),
        amountSol: z.number().optional().describe('Amount in SOL (e.g., 0.1)'),
        amountLamports: z.number().optional().describe('Amount in lamports (overrides amountSol if provided)'),
        apiBaseUrl: z.string().optional().describe('Optional ShadowWire API base URL (defaults to env or https://shadow.radr.fun/shadowpay/api)'),
        apiKey: z.string().optional().describe('Optional ShadowPay API key (only if required by the endpoint)')
    }),
    execute: async (args: { wallet: string; amountSol?: number; amountLamports?: number; apiBaseUrl?: string; apiKey?: string }) => {
        const amountLamports = args.amountLamports ?? Math.floor((args.amountSol ?? 0) * LAMPORTS_PER_SOL);

        if (!Number.isFinite(amountLamports) || amountLamports <= 0) {
            return { error: 'amountLamports or amountSol must be a positive number' };
        }

        const apiBaseUrl = resolveShadowWireApiBase(args.apiBaseUrl);
        const apiKey = args.apiKey || process.env.SHADOWPAY_API_KEY;

        try {
            const client = new ShadowWireClient({
                apiBaseUrl,
                apiKey
            });

            const response = await client.deposit({
                wallet: args.wallet,
                amount: amountLamports
            });

            const unsignedTxBase64 = (response as any)?.unsigned_tx_base64 || (response as any)?.transaction;

            return {
                wallet: args.wallet,
                amountLamports,
                amountSol: amountLamports / LAMPORTS_PER_SOL,
                apiBaseUrl,
                unsignedTxBase64,
                response
            };
        } catch (error: any) {
            return {
                error: error?.message || 'Failed to create deposit transaction'
            };
        }
    }
};

/**
 * Tool: get_pool_balance
 * Fetch pool balance for a wallet (optionally for a token)
 */
export const getPoolBalanceTool = {
    name: 'get_pool_balance',
    description: 'Get the ShadowWire pool balance for a wallet. Optionally filter by token (e.g., SOL, USDC).',
    inputSchema: z.object({
        wallet: z.string().describe('Solana wallet address to check'),
        token: z.string().optional().describe('Optional token symbol (e.g., SOL, USDC)'),
        apiBaseUrl: z.string().optional().describe('Optional ShadowWire API base URL (defaults to env or https://shadow.radr.fun/shadowpay/api)'),
        apiKey: z.string().optional().describe('Optional ShadowPay API key (only if required by the endpoint)')
    }),
    execute: async (args: { wallet: string; token?: string; apiBaseUrl?: string; apiKey?: string }) => {
        const apiBaseUrl = resolveShadowWireApiBase(args.apiBaseUrl);
        const apiKey = args.apiKey || process.env.SHADOWPAY_API_KEY;

        try {
            const client = new ShadowWireClient({
                apiBaseUrl,
                apiKey
            });

            const balance = await client.getBalance(args.wallet, args.token as any);

            return {
                wallet: args.wallet,
                token: args.token,
                apiBaseUrl,
                balance
            };
        } catch (error: any) {
            return {
                error: error?.message || 'Failed to fetch pool balance'
            };
        }
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
    depositToPoolTool,
    getPoolBalanceTool,
    settleTransactionTool
];
