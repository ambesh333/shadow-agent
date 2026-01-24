import { Request, Response } from 'express';
import { prisma } from '../context';
import { ShadowPay } from '@shadowpay/server';

const sp = new ShadowPay({
    apiKey: process.env.SHADOWPAY_API_KEY || 'YOUR_API_KEY',
});

const FACILITATOR_WALLET = process.env.FACILITATOR_WALLET_ADDRESS;

const parsePaymentHeader = (raw: string) => {
    try {
        const decoded = Buffer.from(raw, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
};

/**
 * GET /api/gateway/resource/:resourceId
 * x402 Gateway for merchant resources
 */
export const accessResource = async (req: Request, res: Response) => {
    try {
        const resourceId = req.params.resourceId as string;
        const paymentHeaderRaw = (req.header('X-Payment') || req.header('Authorization')) as string | undefined;

        // 1. Fetch resource details
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            include: { merchant: true }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // 2. Define payment requirements based on resource config
        // IMPORTANT: maxAmountRequired must be in SOL, not lamports
        const priceLamports = resource.price;
        const priceSol = (typeof priceLamports === 'number'
            ? priceLamports / 1_000_000_000
            : Number(priceLamports) / 1_000_000_000).toString();

        const paymentRequirements = {
            scheme: 'zkproof',
            network: resource.network === 'MAINNET' ? 'solana-mainnet' : 'solana-devnet',
            merchantKey: process.env.MERCHANT_KEY || '', // Required for authorization
            maxAmountRequired: priceSol,
            resource: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            description: `Payment for ${resource.title}`,
            mimeType: resource.type === 'IMAGE' ? 'image/png' : 'application/json',
            payTo: FACILITATOR_WALLET || '',
            maxTimeoutSeconds: 300,
            x402Version: 1,
            extra: {
                token: resource.token,
                mint: resource.mintAddress
            }
        };

        // 3. Handle Payment
        if (!paymentHeaderRaw) {
            // No payment provided -> 402
            return res.status(402).json({
                error: 'Payment Required',
                paymentRequirements
            });
        }

        const paymentHeader = parsePaymentHeader(paymentHeaderRaw);
        if (!paymentHeader) {
            return res.status(402).json({
                error: 'Invalid Payment Proof',
                details: 'Payment header must be base64-encoded JSON or raw JSON of the Groth16 proof object',
                paymentRequirements
            });
        }

        // 4. Verify Payment with ShadowPay SDK
        let isValid = false;
        let agentId = 'unknown-agent';

        try {
            // Using the new SDK verifyPayment method
            isValid = await sp.verifyPayment(paymentHeaderRaw!, {
                amount: Number(priceSol),
                token: resource.token === 'NATIVE' ? 'SOL' : resource.token,
            });
            agentId = 'shadow-agent'; // The SDK might provide more info in metadata if configured
        } catch (error: any) {
            console.error('ShadowPay SDK verification error:', error.message);
            return res.status(402).json({
                error: 'Invalid Payment Proof',
                details: error.message,
                paymentRequirements
            });
        }

        if (!isValid) {
            return res.status(402).json({
                error: 'Invalid Payment',
                paymentRequirements
            });
        }

        // 5. DEPLOYMENT: Settlement is typically handled by the SDK or triggered automatically
        // If manual settlement is needed via SDK:
        // await sp.settlePayment(paymentHeaderRaw!);

        // 6. Payment is valid! Lock funds in DB
        const tx = await prisma.transaction.create({
            data: {
                merchantId: resource.merchantId,
                agentId: agentId,
                amount: resource.price,
                status: 'PENDING',
                expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                dataPayload: resource.imageData || resource.url,
            }
        });

        // 7. Deliver Resource
        if (resource.type === 'IMAGE' && resource.imageData) {
            const base64Data = resource.imageData.replace(/^data:image\/\w+;base64,/, '');
            const img = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length,
                'X-Transaction-ID': tx.id
            });
            return res.end(img);
        }

        return res.json({
            success: true,
            transactionId: tx.id,
            title: resource.title,
            type: resource.type,
            data: resource.url || resource.imageData
        });

    } catch (error) {
        console.error('Gateway access error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
