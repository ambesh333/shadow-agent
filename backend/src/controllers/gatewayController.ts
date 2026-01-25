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
        // Price is already stored in SOL (user inputs SOL in frontend)
        const priceSol = resource.price.toString();

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

        // 4. Verify Payment - try JWT access token first, then ZK proof
        let isValid = false;
        let agentId = 'unknown-agent';

        try {
            // First, try to verify as a JWT access token (from ShadowPay SDK)
            // JWT tokens start with "eyJ" AND contain dots (header.payload.signature)
            // Base64 encoded JSON (ZK proofs) also start with "eyJ" typically ("{...") but don't have dots
            if (paymentHeaderRaw.startsWith('eyJ') && paymentHeaderRaw.includes('.')) {
                console.log('Detected JWT access token, verifying with ShadowPay API...');
                const verifyResponse = await fetch('https://shadow.radr.fun/shadowpay/v1/payment/verify-access', {
                    method: 'GET',
                    headers: {
                        'X-Access-Token': paymentHeaderRaw
                    }
                });

                if (verifyResponse.ok) {
                    const verifyData = await verifyResponse.json();
                    isValid = verifyData.authorized === true;
                    agentId = 'shadow-agent';
                    console.log('Access token verified:', verifyData);
                } else {
                    const errorData = await verifyResponse.json().catch(() => ({}));
                    console.log('Access token verification failed:', errorData);
                    return res.status(402).json({
                        error: 'Invalid Access Token',
                        details: errorData.error || 'Access token verification failed',
                        paymentRequirements
                    });
                }
            } else {
                // Try to parse as ZK proof (base64 JSON or raw JSON)
                const paymentHeader = parsePaymentHeader(paymentHeaderRaw);
                if (!paymentHeader) {
                    return res.status(402).json({
                        error: 'Invalid Payment Proof',
                        details: 'Payment header must be a JWT access token or base64-encoded JSON of the Groth16 proof object',
                        paymentRequirements
                    });
                }

                // Verify ZK proof manually to ensure correct payTo recipient
                // The SDK defaults payTo = apiKey, but we need payTo = FACILITATOR_WALLET
                const apiUrl = process.env.SHADOWPAY_API_URL || 'https://shadow.radr.fun/shadowpay';
                const apiKey = process.env.SHADOWPAY_API_KEY;

                console.log(`Verifying proof for recipient: ${FACILITATOR_WALLET}`);

                const verifyRes = await fetch(`${apiUrl}/verify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        x402Version: 1,
                        paymentHeader: paymentHeaderRaw,
                        paymentRequirements: {
                            scheme: 'zkproof',
                            network: resource.network === 'MAINNET' ? 'solana-mainnet' : 'solana-devnet',
                            maxAmountRequired: priceSol,
                            payTo: FACILITATOR_WALLET // Explicitly match the proof's recipient
                        }
                    })
                });

                if (verifyRes.ok) {
                    const vData = await verifyRes.json();
                    console.log('Verification response:', vData);
                    isValid = vData.isValid;
                } else {
                    console.error('Manual verification HTTP error:', await verifyRes.text());
                    isValid = false;
                }
                agentId = 'shadow-agent';
            }
        } catch (error: any) {
            console.error('ShadowPay verification error:', error.message);
            return res.status(402).json({
                error: 'Payment Verification Failed',
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

        // 6. Payment is valid! Lock funds in DB with escrow info
        // Generate unique receipt code (short alphanumeric)
        const receiptCode = `RCP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Calculate auto-settle time based on resource config
        const autoSettleAt = new Date(Date.now() + (resource.autoApprovalMinutes || 60) * 60 * 1000);

        const tx = await prisma.transaction.create({
            data: {
                merchantId: resource.merchantId,
                agentId: agentId,
                amount: resource.price,
                network: resource.network,
                token: resource.token,
                status: 'PENDING',
                expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                dataPayload: resource.imageData || resource.url,
                receiptCode: receiptCode,
                autoSettleAt: autoSettleAt,
                merchantPubKey: resource.merchant.walletAddress, // For dispute encryption
            }
        });

        // 7. Deliver Resource with receipt info
        if (resource.type === 'IMAGE' && resource.imageData) {
            const base64Data = resource.imageData.replace(/^data:image\/\w+;base64,/, '');
            const img = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length,
                'X-Transaction-ID': tx.id,
                'X-Receipt-Code': tx.receiptCode,
                'X-Auto-Settle-At': tx.autoSettleAt?.toISOString() || '',
                'X-Merchant-Name': resource.merchant.displayName || 'Merchant',
            });
            return res.end(img);
        }

        return res.json({
            success: true,
            transactionId: tx.id,
            receiptCode: tx.receiptCode,
            merchantName: resource.merchant.displayName || 'Merchant',
            autoSettleAt: tx.autoSettleAt?.toISOString(),
            autoApprovalMinutes: resource.autoApprovalMinutes,
            title: resource.title,
            type: resource.type,
            data: resource.url || resource.imageData
        });

    } catch (error) {
        console.error('Gateway access error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
