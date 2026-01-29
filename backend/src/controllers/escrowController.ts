import { Request, Response } from 'express';
import { prisma, shadowPay } from '../context';
import { decryptDisputeMessage, verifyWalletSignature } from '../clients/encryption';

// 1. Discovery / Gateway
export const getPremiumData = async (req: Request, res: Response) => {
    const { merchantId, sku } = req.params;

    // Logic to calculate price based on SKU...
    const price = 10; // Mock price

    // 402 Payment Required response
    res.status(402).json({
        error: "Payment Required",
        details: {
            amount: price,
            currency: "USDC",
            facilitator_address: "FACILITATOR_WALLET_ADDRESS", // In real app, from env
            memo: `Purchase ${sku} from ${merchantId}`
        }
    });
};

// 2. Initial Escrow is now handled in gatewayController.ts
// This initEscrow might be kept for direct payments if needed.
export const initEscrow = async (req: Request, res: Response) => {
    // In our new flow, gatewayController creates the transaction after on-chain settlement.
    res.status(401).json({ error: "Please use the Gateway access endpoint for and Resource payments." });
};

// 3. Finalize / Settle (Agent confirms data is good)
export const settleTransaction = async (req: Request, res: Response) => {
    const { transactionId, status } = req.body;

    try {
        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { merchant: true }
        });

        if (!tx || tx.status !== 'PENDING') {
            return res.status(400).json({ error: "Invalid or already settled transaction" });
        }

        if (status === 'OK') {
            // Agent is happy. Pay the Merchant.
            console.log(`Finalizing transaction ${transactionId}. Paying merchant ${tx.merchant.walletAddress}`);

            // 1. Execute Payout from Facilitator to Merchant
            try {
                const payout = await shadowPay.payoutToMerchant(tx.merchant.walletAddress, tx.amount);
                console.log('Payout initiated:', payout);
            } catch (error: any) {
                console.error('Merchant payout error:', error.response?.data || error.message);
                return res.status(500).json({ error: "Failed to payout to merchant" });
            }

            // 2. Update DB
            await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'SETTLED' }
            });

            return res.json({ success: true, status: 'SETTLED' });
        } else {
            return res.status(400).json({ error: "Invalid status. Use /dispute for issues." });
        }
    } catch (error: any) {
        console.error('Settle transaction error:', error);
        return res.status(500).json({ error: error.message });
    }
};

// 4. Dispute (Agent wants refund)
export const disputeTransaction = async (req: Request, res: Response) => {
    const { transactionId, encryptedReason } = req.body;

    try {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== 'PENDING') {
            return res.status(400).json({ error: "Invalid transaction for dispute" });
        }

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'REFUND_REQUESTED',
                encryptedDisputeReason: encryptedReason
            }
        });
        return res.json({ success: true, status: 'REFUND_REQUESTED' });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

// 5. Merchant/Facilitator Resolve (Approve Refund or Deny)
export const resolveDispute = async (req: Request, res: Response) => {
    const { transactionId, decision } = req.body; // decision: 'REFUND' | 'REJECT'

    try {
        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { merchant: true }
        });

        if (!tx || tx.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: "No active dispute found for this transaction" });
        }

        if (decision === 'REFUND') {
            // Facilitator Refunds the Agent
            // Note: agentId in this context is the shadow-agent identifier/wallet
            try {
                await shadowPay.refundToAgent(tx.agentId, tx.amount);
            } catch (error: any) {
                console.error('Refund error:', error.response?.data || error.message);
                return res.status(500).json({ error: "Failed to process refund" });
            }

            await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'REFUNDED' }
            });
            return res.json({ success: true, status: 'REFUNDED' });
        } else {
            // Reject refund -> Pay Merchant
            try {
                await shadowPay.payoutToMerchant(tx.merchant.walletAddress, tx.amount);
            } catch (error: any) {
                console.error('Reject-resolve payout error:', error.response?.data || error.message);
                return res.status(500).json({ error: "Failed to payout to merchant after rejection" });
            }

            await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'SETTLED' }
            });
            return res.json({ success: true, status: 'SETTLED_FORCED' });
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * 6. Decrypt Dispute Reason
 * POST /api/escrow/decrypt-dispute
 * 
 * Merchant proves wallet ownership via signature, then we decrypt the dispute reason
 */
export const decryptDispute = async (req: Request, res: Response) => {
    const { transactionId, walletAddress, signature, message } = req.body;

    try {
        // 1. Find the transaction
        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { merchant: true }
        });

        if (!tx) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        // 2. Verify the requester is the merchant for this transaction
        if (tx.merchant.walletAddress !== walletAddress) {
            return res.status(403).json({ error: "Unauthorized - not the merchant for this transaction" });
        }

        // 3. Verify the wallet signature
        const isValidSignature = verifyWalletSignature(walletAddress, message, signature);
        if (!isValidSignature) {
            return res.status(401).json({ error: "Invalid signature" });
        }

        // 4. Check if there's an encrypted dispute reason
        if (!tx.encryptedDisputeReason) {
            return res.status(400).json({ error: "No encrypted dispute reason found" });
        }

        // 5. Decrypt the dispute reason
        const decryptedReason = decryptDisputeMessage(tx.encryptedDisputeReason);

        if (!decryptedReason) {
            // Fallback: try base64 decode for old disputes
            try {
                const legacyDecoded = Buffer.from(tx.encryptedDisputeReason, 'base64').toString('utf-8');
                return res.json({
                    success: true,
                    reason: legacyDecoded,
                    legacy: true
                });
            } catch {
                return res.status(500).json({ error: "Failed to decrypt dispute reason" });
            }
        }

        return res.json({
            success: true,
            reason: decryptedReason
        });

    } catch (error: any) {
        console.error('Decrypt dispute error:', error);
        return res.status(500).json({ error: error.message });
    }
};
