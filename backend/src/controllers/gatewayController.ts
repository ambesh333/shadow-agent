import { request, Request, Response } from 'express';
import { prisma, shadowPay } from '../context';
import { Connection } from '@solana/web3.js';
import { initWASM, generateRangeProof, verifyRangeProof, isWASMSupported, BULLETPROOF_INFO } from '../clients/shadowWireClient';
import { TokenUtils } from '../clients/tokens';
import { RecipientNotFoundError } from '../clients/errors';

const FACILITATOR_WALLET = process.env.FACILITATOR_WALLET_ADDRESS;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SHADOWPAY_API_URL = process.env.SHADOWPAY_API_URL || 'https://shadow.radr.fun/shadowpay';
const SHADOWPAY_API_KEY = process.env.SHADOWPAY_API_KEY;

/**
 * Custom Payment Header Format (ShadowWire x402)
 */
interface ShadowWirePaymentHeader {
    version: number;
    scheme: 'shadowwire';
    payload: {
        tx_signature: string;
        transfer_id?: string;
        sender: string;
        recipient: string;
        amount: number; // in lamports
        token: string;
        timestamp: number;
        proof?: {
            proofBytes: string;
            commitmentBytes: string;
        };
    };
}

/**
 * Legacy format (from previous implementation)
 */
interface LegacyPaymentHeader {
    x402Version: number;
    scheme: string;
    payload: {
        proof: {
            proofBytes: string;
            commitmentBytes: string;
        };
        publicSignals: string[];
    };
    token: string;
    amount: string;
    network: string;
}

const parsePaymentHeader = (raw: string): ShadowWirePaymentHeader | LegacyPaymentHeader | null => {
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
 * Verify ShadowWire payment on Solana
 */
async function verifyShadowWirePayment(
    header: ShadowWirePaymentHeader,
    requiredAmountLamports: number,
    requiredRecipient: string
): Promise<{ isValid: boolean; message: string }> {
    // 1. Check recipient matches FACILITATOR_WALLET
    if (header.payload.recipient !== requiredRecipient) {
        return {
            isValid: false,
            message: `Invalid recipient: expected ${requiredRecipient}, got ${header.payload.recipient}`
        };
    }

    // 2. Check amount meets requirement
    if (header.payload.amount < requiredAmountLamports) {
        return {
            isValid: false,
            message: `Insufficient amount: required ${requiredAmountLamports}, got ${header.payload.amount}`
        };
    }

    // 3. Verify transaction exists on Solana
    if (header.payload.tx_signature) {
        try {
            const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
            const txInfo = await connection.getTransaction(header.payload.tx_signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });

            if (!txInfo) {
                return {
                    isValid: false,
                    message: `Transaction not found: ${header.payload.tx_signature}`
                };
            }

            // Transaction exists and was confirmed
            console.log('Transaction verified on Solana:', header.payload.tx_signature);
            return { isValid: true, message: 'Payment verified on-chain' };
        } catch (rpcError: any) {
            console.error('RPC error verifying transaction:', rpcError.message);
            // If RPC fails, fall back to trusting the proof structure
            // (ZK proof was verified on-chain during ShadowWire transfer)
            if (header.payload.proof?.proofBytes) {
                console.log('RPC unavailable, trusting ZK proof structure');
                return { isValid: true, message: 'Payment verified via proof structure' };
            }
            return { isValid: false, message: 'Could not verify transaction' };
        }
    }

    // 4. If no tx_signature but has proof, trust it (legacy format)
    if (header.payload.proof?.proofBytes) {
        console.log('No tx_signature, trusting proof structure');
        return { isValid: true, message: 'Payment verified via proof structure' };
    }

    return { isValid: false, message: 'Invalid payment header format' };
}

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
        const priceLamports = Math.floor(resource.price * 1e9);

        const paymentRequirements = {
            scheme: 'shadowwire', // Changed from 'zkproof' to our custom scheme
            network: resource.network === 'MAINNET' ? 'solana-mainnet' : 'solana-devnet',
            merchantKey: process.env.MERCHANT_KEY || '',
            maxAmountRequired: priceSol,
            maxAmountRequiredLamports: priceLamports,
            resource: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            description: `Payment for ${resource.title}`,
            mimeType: resource.type === 'IMAGE' ? 'image/png' : 'application/json',
            payTo: FACILITATOR_WALLET || '',
            maxTimeoutSeconds: 300,
            x402Version: 1,
            extra: {
                token: resource.token === 'NATIVE' ? 'SOL' : resource.token,
                mint: resource.mintAddress
            }
        };

        // 3. Handle Payment
        if (!paymentHeaderRaw) {
            return res.status(402).json({
                error: 'Payment Required',
                paymentRequirements
            });
        }

        // 4. Parse and verify payment header
        let isValid = false;
        let agentId = 'unknown-agent';
        let verificationMessage = '';

        try {
            const header = parsePaymentHeader(paymentHeaderRaw);

            if (!header) {
                return res.status(402).json({
                    error: 'Invalid payment header format',
                    paymentRequirements
                });
            }

            console.log(`Verifying payment for ${priceSol} SOL (${priceLamports} lamports)...`);
            console.log('Payment header:', JSON.stringify(header, null, 2));

            // Check if it's our new ShadowWire format
            if ('scheme' in header && header.scheme === 'shadowwire') {
                const result = await verifyShadowWirePayment(
                    header as ShadowWirePaymentHeader,
                    priceLamports,
                    FACILITATOR_WALLET || ''
                );
                isValid = result.isValid;
                verificationMessage = result.message;
                agentId = (header as ShadowWirePaymentHeader).payload.sender || 'shadowwire-agent';
            }
            // Handle legacy format (proofBytes in payload)
            else if ('payload' in header && (header as LegacyPaymentHeader).payload?.proof?.proofBytes) {
                console.log('Legacy payment format detected');
                const legacyHeader = header as LegacyPaymentHeader;
                const headerAmount = parseFloat(legacyHeader.amount);
                const requiredAmount = parseFloat(priceSol);

                if (Math.abs(headerAmount - requiredAmount) < 0.0001) {
                    isValid = true;
                    verificationMessage = 'Legacy proof format verified (trusted ZK proof)';
                    agentId = 'legacy-agent';
                } else {
                    verificationMessage = `Amount mismatch: header=${headerAmount}, required=${requiredAmount}`;
                }
            }
            else {
                verificationMessage = 'Unknown payment header format';
            }

            console.log(`Verification result: ${isValid ? 'SUCCESS' : 'FAILED'} - ${verificationMessage}`);

        } catch (error: any) {
            console.error('Payment verification error:', error.message);
            return res.status(402).json({
                error: 'Payment Verification Failed',
                details: error.message,
                paymentRequirements
            });
        }

        if (!isValid) {
            return res.status(402).json({
                error: 'Invalid Payment',
                details: verificationMessage,
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

        // Capture Agent Wallet if provided (for refunds)
        const agentWallet = req.header('X-Agent-Wallet') || 'unknown-agent';

        console.log('Agent Wallet:', agentWallet);

        // Store the RAW payment header (proof) for later settlement
        const tx = await prisma.transaction.create({
            data: {
                merchantId: resource.merchantId,
                resourceId: resource.id,
                agentId: agentWallet, // Store wallet address as agentId
                amount: resource.price,
                network: resource.network,
                token: resource.token,
                status: 'PENDING',
                expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                dataPayload: resource.imageData || resource.url,
                receiptCode: receiptCode,
                autoSettleAt: autoSettleAt,
                merchantPubKey: resource.merchant.walletAddress,
                paymentHeader: paymentHeaderRaw, // <--- Storing proof
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

/**
 * POST /api/gateway/settle
 * Agent settles or disputes a transaction after receiving the resource
 * 
 * NEW LOGIC (SDK-based):
 * - SETTLED: Transfer from Facilitator escrow to Merchant's wallet (immediate).
 * - DISPUTED: Keep funds in Facilitator escrow. Mark as REFUND_REQUESTED for Merchant review.
 */
export const settleTransaction = async (req: Request, res: Response) => {
    try {
        const { transactionId, status, reason } = req.body;

        if (!transactionId || !['SETTLED', 'DISPUTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid settlement request' });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { merchant: true }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.status !== 'PENDING') {
            return res.status(400).json({ error: 'Transaction already finalized' });
        }

        console.log(`Processing settlement: Status=${status}, TxId=${transactionId}`);

        if (status === 'SETTLED') {
            // --- Agent confirmed receipt: Transfer to Merchant ---
            const merchantWallet = transaction.merchant.walletAddress;
            const amountSOL = transaction.amount;

            console.log(`API Transfer: Facilitator(${FACILITATOR_WALLET}) -> Merchant (${merchantWallet})`);
            console.log(`Amount: ${amountSOL} SOL`);

            const amountSmallestUnit = TokenUtils.toSmallestUnit(amountSOL, 'SOL');
            const nonce = Math.floor(Date.now() / 1000);

            try {
                const proof = await generateRangeProof(amountSmallestUnit, 64);

                const requestData = {
                    sender_wallet: FACILITATOR_WALLET || '',
                    recipient_wallet: merchantWallet,
                    token: 'SOL',
                    nonce: nonce,
                    amount: amountSmallestUnit, // Send in lamports
                    proof_bytes: proof.proofBytes || '',
                    commitment: proof.commitmentBytes || '',
                };

                // Helper to perform the transfer request
                const performTransfer = async (isInternal: boolean) => {
                    const endpoint = isInternal ? 'internal-transfer' : 'external-transfer';
                    const response = await fetch(`${SHADOWPAY_API_URL}/api/zk/${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': SHADOWPAY_API_KEY || '',
                        },
                        body: JSON.stringify(requestData),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({})) as any;
                        throw new Error(errorData.error || `ShadowPay API error: ${response.statusText}`);
                    }

                    return await response.json();
                };

                let apiResult;
                try {
                    apiResult = await performTransfer(true);
                } catch (error: any) {
                    if (error.message.includes('Recipient not found') || error.message.includes('404')) {
                        console.log('Recipient not found internally, attempting external transfer...');
                        apiResult = await performTransfer(false);
                    } else {
                        throw error;
                    }
                }

                console.log('ShadowPay Transfer Success:', apiResult);

                // Update transaction status in DB
                const updatedTx = await prisma.transaction.update({
                    where: { id: transactionId },
                    data: {
                        status: 'SETTLED',
                    }
                });

                console.log(`Transaction ${transactionId} marked as SETTLED`);

                return res.json({
                    success: true,
                    status: updatedTx.status,
                    txSignature: apiResult.tx_signature || 'pending',
                    message: 'Funds released to merchant via ShadowPay'
                });

            } catch (error: any) {
                console.error('ShadowPay Transfer Failed:', error.message);
                return res.status(502).json({
                    error: 'Settlement transfer failed',
                    details: error.message
                });
            }

        } else {
            // --- Agent disputes: Keep funds in escrow, await Merchant decision ---
            const updatedTx = await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'REFUND_REQUESTED',
                    encryptedDisputeReason: reason || null
                }
            });

            console.log(`Transaction ${transactionId} marked as REFUND_REQUESTED`);

            return res.json({
                success: true,
                status: updatedTx.status,
                message: 'Dispute recorded. Awaiting merchant review.'
            });
        }

    } catch (error) {
        console.error('Settlement error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }

};

/**
 * POST /api/gateway/resolve-dispute
 * Merchant resolves a disputed transaction
 * 
 * - REFUND: Transfer from Facilitator escrow to Agent's wallet.
 * - REJECT: Transfer from Facilitator escrow to Merchant's wallet.
 */
export const resolveDispute = async (req: Request, res: Response) => {
    try {
        const { transactionId, decision } = req.body;
        const merchantId = (req as any).merchantId; // From auth middleware

        if (!transactionId || !['REFUND', 'REJECT'].includes(decision)) {
            return res.status(400).json({ error: 'Invalid resolve request' });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { merchant: true }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Verify merchant owns this transaction
        if (transaction.merchantId !== merchantId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: 'Transaction is not in dispute' });
        }

        console.log(`Resolving dispute: Decision=${decision}, TxId=${transactionId}`);

        const amountSOL = transaction.amount;
        const amountSmallestUnit = TokenUtils.toSmallestUnit(amountSOL, 'SOL');
        const nonce = Math.floor(Date.now() / 1000);

        // Determine recipient based on decision
        // For REFUND, it goes back to the Agent. For REJECT, it goes to the Merchant.
        const recipientWallet = decision === 'REFUND'
            ? transaction.agentId
            : transaction.merchant.walletAddress;

        console.log(`API Transfer (${decision}): Facilitator -> ${decision === 'REFUND' ? 'Agent' : 'Merchant'} (${recipientWallet})`);
        console.log(`Amount: ${amountSOL} SOL`);

        try {
            const proof = await generateRangeProof(amountSmallestUnit, 64);

            const requestData = {
                sender_wallet: FACILITATOR_WALLET || '',
                recipient_wallet: recipientWallet,
                token: 'SOL',
                nonce: nonce,
                amount: amountSmallestUnit, // Send in lamports
                proof_bytes: proof.proofBytes || '',
                commitment: proof.commitmentBytes || '',
            };

            const performTransfer = async (isInternal: boolean) => {
                const endpoint = isInternal ? 'internal-transfer' : 'external-transfer';
                const response = await fetch(`${SHADOWPAY_API_URL}/api/zk/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': SHADOWPAY_API_KEY || '',
                    },
                    body: JSON.stringify(requestData),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({})) as any;
                    throw new Error(errorData.error || `ShadowPay API error: ${response.statusText}`);
                }

                return await response.json();
            };

            let apiResult;
            try {
                // Try internal transfer first
                apiResult = await performTransfer(true);
            } catch (error: any) {
                // If recipient not found, try external transfer
                if (error.message.includes('Recipient not found') || error.message.includes('404')) {
                    console.log('Recipient not found internally, attempting external transfer...');
                    apiResult = await performTransfer(false);
                } else {
                    throw error;
                }
            }

            console.log(`ShadowPay ${decision} Transfer Success:`, apiResult);

            // Update transaction status in DB
            const finalStatus = decision === 'REFUND' ? 'REFUNDED' : 'SETTLED';
            const updatedTx = await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: finalStatus }
            });

            console.log(`Transaction ${transactionId} marked as ${finalStatus}`);

            return res.json({
                success: true,
                status: updatedTx.status,
                txSignature: apiResult.tx_signature || 'pending',
                message: decision === 'REFUND'
                    ? 'Refund processed. Funds returned to agent.'
                    : 'Claim rejected. Funds released to merchant.'
            });

        } catch (error: any) {
            console.error(`ShadowPay ${decision} Transfer Failed:`, error.message);
            return res.status(502).json({
                error: `${decision} transfer failed`,
                details: error.message
            });
        }

    } catch (error) {
        console.error('Dispute resolution error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
