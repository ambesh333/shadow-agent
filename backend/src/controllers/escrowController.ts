import { Request, Response } from 'express';
import { prisma, shadowPay } from '../context';

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

// 2. Fund Escrow (Agent calls this after paying ShadowPay)
export const initEscrow = async (req: Request, res: Response) => {
    const { proof, transactionPayload, merchantId, agentId, amount } = req.body;

    try {
        // A. Verify the Proof with ShadowPay (ensure Facilitator actually got funds)
        const verification = await shadowPay.settleIncomingPayment(proof, transactionPayload);

        if (!verification || verification.error) {
            res.status(400).json({ error: "Invalid Proof" });
            return;
        }

        // B. Create Transaction Record in PENDING/HELD state
        const tx = await prisma.transaction.create({
            data: {
                merchantId,
                agentId,
                amount,
                status: 'PENDING',
                expiryAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour to verify
                // In reality, we would fetch the 'dataPayload' here securely
                dataPayload: "PREMIUM_SECRET_DATA_XYZ_123"
            }
        });

        res.json({
            success: true,
            transactionId: tx.id,
            data: tx.dataPayload
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Finalize / Settle (Agent confirms data is good)
export const settleTransaction = async (req: Request, res: Response) => {
    const { transactionId, status } = req.body;

    try {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== 'PENDING') {
            res.status(400).json({ error: "Invalid Transaction" });
            return;
        }

        if (status === 'OK') {
            // Agent is happy. Pay the Merchant.
            // 1. Execute ZK Payout to Merchant Address (Mocked)
            await shadowPay.payoutToMerchant(tx.merchantId, tx.amount);

            // 2. Update DB
            const updated = await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'SETTLED' }
            });

            res.json({ success: true, status: 'SETTLED' });
        } else {
            res.status(400).json({ error: "Invalid Status. Use /dispute for issues." });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Dispute (Agent wants refund)
export const disputeTransaction = async (req: Request, res: Response) => {
    const { transactionId, encryptedReason } = req.body;

    try {
        const tx = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'REFUND_REQUESTED',
                encryptedDisputeReason: encryptedReason
            }
        });
        res.json({ success: true, status: 'REFUND_REQUESTED' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Merchant Resolve (Approve Refund)
export const resolveDispute = async (req: Request, res: Response) => {
    const { transactionId, decision } = req.body; // decision: 'REFUND' | 'REJECT'

    try {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== 'REFUND_REQUESTED') {
            res.status(400).json({ error: "Invalid Dispute" });
            return;
        }

        if (decision === 'REFUND') {
            // Refund the Agent
            await shadowPay.refundToAgent(tx.agentId, tx.amount);

            await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'REFUNDED' }
            });
            res.json({ success: true, status: 'REFUNDED' });
        } else {
            // Reject refund -> Pay Merchant (Simplified flow)
            await shadowPay.payoutToMerchant(tx.merchantId, tx.amount);

            await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'SETTLED' } // Force settle
            });
            res.json({ success: true, status: 'SETTLED_FORCED' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
