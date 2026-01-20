import { Request, Response } from 'express';
import { prisma, shadowPay } from '../context';
import { X402PaymentRequirements } from '../clients/shadowPayClient';

const FACILITATOR_WALLET = process.env.FACILITATOR_WALLET_ADDRESS;

/**
 * GET /api/gateway/resource/:resourceId
 * x402 Gateway for merchant resources
 */
export const accessResource = async (req: Request, res: Response) => {
    try {
        const resourceId = req.params.resourceId as string;
        const paymentHeader = (req.header('X-Payment') || req.header('Authorization')) as string | undefined;

        // 1. Fetch resource details
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            include: { merchant: true }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // 2. Define payment requirements based on resource config
        const paymentRequirements: X402PaymentRequirements = {
            scheme: 'zkproof',
            network: resource.network === 'MAINNET' ? 'solana-mainnet' : 'solana-devnet',
            maxAmountRequired: resource.price.toString(),
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
        if (!paymentHeader) {
            // No payment provided -> 402
            return res.status(402).json({
                error: 'Payment Required',
                paymentRequirements
            });
        }

        // 4. Verify Payment with ShadowPay
        let isValid = false;
        let agentId = 'unknown-agent';

        try {
            const verification = await shadowPay.verifyX402(paymentHeader!, paymentRequirements);
            isValid = verification.isValid;
            agentId = verification.paymentToken || 'shadow-agent';
        } catch (error: any) {
            const errorData = error.response?.data;
            console.error('ShadowPay verification error:', errorData || error.message);
            return res.status(402).json({
                error: 'Invalid Payment Proof',
                details: errorData || error.message,
                paymentRequirements
            });
        }

        if (!isValid) {
            return res.status(402).json({
                error: 'Invalid Payment',
                paymentRequirements
            });
        }

        // 5. DEPLOYMENT: Settle the payment on-chain to the Facilitator
        try {
            const settlement = await shadowPay.settleX402(paymentHeader!, paymentRequirements);
            if (!settlement.success) {
                return res.status(400).json({
                    error: 'Settlement Failed',
                    details: settlement.error,
                    paymentRequirements
                });
            }
            console.log(`Payment settled to Facilitator. Tx: ${settlement.txHash}`);
        } catch (error: any) {
            console.error('ShadowPay settlement error:', error.response?.data || error.message);
            return res.status(500).json({ error: 'Failed to settle payment to Facilitator' });
        }

        // 6. Payment is valid and settled! Lock funds in DB (marked as HELD in escrow)
        const tx = await prisma.transaction.create({
            data: {
                merchantId: resource.merchantId,
                agentId: agentId,
                amount: resource.price,
                status: 'PENDING',
                expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours to confirm
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
