/**
 * MCP Resources for Shadow Agent
 * Defines resource templates for dynamic resource discovery
 */
import { prisma } from '../context';

/**
 * Resource template for marketplace info
 */
export const marketplaceResource = {
    uri: 'shadow://marketplace',
    name: 'Shadow Agent Marketplace',
    description: 'Information about the Shadow Agent privacy-preserving AI marketplace',
    mimeType: 'application/json',
    fetch: async () => {
        const totalResources = await prisma.resource.count({ where: { isActive: true } });
        const totalTransactions = await prisma.transaction.count();
        const settledTransactions = await prisma.transaction.count({ where: { status: 'SETTLED' } });

        return JSON.stringify({
            name: 'Shadow Agent',
            description: 'Privacy-Preserving AI Marketplace on Solana',
            features: [
                'Zero-knowledge Bulletproof cryptography for private payments',
                'AI-powered dispute resolution',
                'x402 Payment Required protocol for seamless agent integration',
                'Escrow protection with trust scores'
            ],
            stats: {
                activeResources: totalResources,
                totalTransactions,
                settledTransactions,
                successRate: totalTransactions > 0
                    ? Math.round((settledTransactions / totalTransactions) * 100)
                    : 100
            },
            endpoints: {
                explore: '/api/explore',
                gateway: '/api/gateway/resource/{id}',
                settle: '/api/gateway/settle'
            },
            protocol: 'x402 (HTTP 402 Payment Required)'
        }, null, 2);
    }
};

/**
 * Resource template for individual resources
 */
export const resourceTemplate = {
    uriTemplate: 'shadow://resources/{id}',
    name: 'Marketplace Resource',
    description: 'A resource available for purchase in the Shadow Agent marketplace',
    mimeType: 'application/json',
    fetch: async (uri: string) => {
        // Extract ID from URI like "shadow://resources/abc123"
        const match = uri.match(/^shadow:\/\/resources\/(.+)$/);
        if (!match) {
            return JSON.stringify({ error: 'Invalid resource URI' });
        }

        const id = match[1];
        const resource = await prisma.resource.findFirst({
            where: { id, isActive: true },
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                price: true,
                network: true,
                token: true,
                createdAt: true
            }
        });

        if (!resource) {
            return JSON.stringify({ error: 'Resource not found', id });
        }

        return JSON.stringify(resource, null, 2);
    }
};

// Export all resources
export const allResources = [marketplaceResource];
export const allResourceTemplates = [resourceTemplate];
