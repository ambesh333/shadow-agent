import { Request, Response } from 'express';
import { prisma } from '../context';

// Types for request bodies
interface CreateResourceBody {
    title: string;
    description?: string;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price?: number;
    imageData?: string; // base64 for IMAGE type
    url?: string;       // URL for VIDEO/LINK type
    network?: 'MAINNET' | 'DEVNET';
    token?: 'NATIVE' | 'USDC' | 'USDT';
    mintAddress?: string;
    autoApprovalMinutes?: number; // Auto-settle timeout for escrow
}

interface UpdateResourceBody extends Partial<CreateResourceBody> {
    isActive?: boolean;
}

/**
 * GET /api/resources
 * List all resources for the authenticated merchant
 */
export const listResources = async (req: Request, res: Response) => {
    try {
        const merchantId = (req as any).merchantId;

        if (!merchantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const resources = await prisma.resource.findMany({
            where: { merchantId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                price: true,
                url: true,
                isActive: true,
                autoApprovalMinutes: true,
                createdAt: true,
                updatedAt: true,
                // Exclude imageData from list to reduce payload size
            }
        });

        return res.json({ resources });
    } catch (error) {
        console.error('List resources error:', error);
        return res.status(500).json({ error: 'Failed to fetch resources' });
    }
};

/**
 * GET /api/resources/:id
 * Get a single resource by ID (includes imageData)
 */
export const getResource = async (req: Request, res: Response) => {
    try {
        const merchantId = (req as any).merchantId;
        const id = req.params.id as string;

        if (!merchantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const resource = await prisma.resource.findFirst({
            where: { id, merchantId }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        return res.json({ resource });
    } catch (error) {
        console.error('Get resource error:', error);
        return res.status(500).json({ error: 'Failed to fetch resource' });
    }
};

/**
 * POST /api/resources
 * Create a new resource
 */
export const createResource = async (req: Request, res: Response) => {
    try {
        const merchantId = (req as any).merchantId;
        const body: CreateResourceBody = req.body;

        if (!merchantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Validation
        if (!body.title || !body.type) {
            return res.status(400).json({ error: 'Title and type are required' });
        }

        if (!['IMAGE', 'VIDEO', 'LINK'].includes(body.type)) {
            return res.status(400).json({ error: 'Type must be IMAGE, VIDEO, or LINK' });
        }

        if (body.type === 'IMAGE' && !body.imageData) {
            return res.status(400).json({ error: 'imageData is required for IMAGE type' });
        }

        if ((body.type === 'VIDEO' || body.type === 'LINK') && !body.url) {
            return res.status(400).json({ error: 'url is required for VIDEO/LINK type' });
        }

        // Validation: Network and Token pairing
        if (body.network === 'DEVNET' && body.token && body.token !== 'NATIVE') {
            return res.status(400).json({ error: 'Devnet only supports Native SOL payments' });
        }

        const resource = await prisma.resource.create({
            data: {
                merchantId,
                title: body.title,
                description: body.description,
                type: body.type,
                price: body.price || 0,
                network: body.network || 'MAINNET',
                token: body.token || 'NATIVE',
                mintAddress: body.token === 'NATIVE' ? null : body.mintAddress,
                imageData: body.type === 'IMAGE' ? body.imageData : null,
                url: body.type !== 'IMAGE' ? body.url : null,
                autoApprovalMinutes: body.autoApprovalMinutes || 60,
            }
        });

        return res.status(201).json({
            resource: {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                type: resource.type,
                price: resource.price,
                network: resource.network,
                token: resource.token,
                mintAddress: resource.mintAddress,
                url: resource.url,
                isActive: resource.isActive,
                autoApprovalMinutes: resource.autoApprovalMinutes,
                createdAt: resource.createdAt
            }
        });
    } catch (error) {
        console.error('Create resource error:', error);
        return res.status(500).json({ error: 'Failed to create resource' });
    }
};

/**
 * PATCH /api/resources/:id
 * Update a resource
 */
export const updateResource = async (req: Request, res: Response) => {
    try {
        const merchantId = (req as any).merchantId;
        const id = req.params.id as string;
        const body: UpdateResourceBody = req.body;

        if (!merchantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check ownership
        const existing = await prisma.resource.findFirst({
            where: { id, merchantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Validation: Network and Token pairing
        if (body.network && body.token && body.network === 'DEVNET' && body.token !== 'NATIVE') {
            return res.status(400).json({ error: 'Devnet only supports Native SOL payments' });
        }

        const resource = await prisma.resource.update({
            where: { id },
            data: {
                title: body.title,
                description: body.description,
                price: body.price,
                isActive: body.isActive,
                network: body.network,
                token: body.token,
                mintAddress: body.token === 'NATIVE' ? null : body.mintAddress,
                // Only update imageData/url if type matches
                ...(existing.type === 'IMAGE' && body.imageData && { imageData: body.imageData }),
                ...(existing.type !== 'IMAGE' && body.url && { url: body.url }),
            }
        });

        return res.json({ resource });
    } catch (error) {
        console.error('Update resource error:', error);
        return res.status(500).json({ error: 'Failed to update resource' });
    }
};

/**
 * DELETE /api/resources/:id
 * Delete a resource
 */
export const deleteResource = async (req: Request, res: Response) => {
    try {
        const merchantId = (req as any).merchantId;
        const id = req.params.id as string;

        if (!merchantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check ownership
        const existing = await prisma.resource.findFirst({
            where: { id, merchantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        await prisma.resource.delete({ where: { id } });

        return res.json({ success: true });
    } catch (error) {
        console.error('Delete resource error:', error);
        return res.status(500).json({ error: 'Failed to delete resource' });
    }
};
