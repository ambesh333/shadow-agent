"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDispute = exports.disputeTransaction = exports.settleTransaction = exports.initEscrow = exports.getPremiumData = void 0;
const context_1 = require("../context");
// 1. Discovery / Gateway
const getPremiumData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
});
exports.getPremiumData = getPremiumData;
// 2. Fund Escrow (Agent calls this after paying ShadowPay)
const initEscrow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { proof, transactionPayload, merchantId, agentId, amount } = req.body;
    try {
        // A. Verify the Proof with ShadowPay (ensure Facilitator actually got funds)
        const verification = yield context_1.shadowPay.settleIncomingPayment(proof, transactionPayload);
        if (!verification || verification.error) {
            res.status(400).json({ error: "Invalid Proof" });
            return;
        }
        // B. Create Transaction Record in PENDING/HELD state
        const tx = yield context_1.prisma.transaction.create({
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.initEscrow = initEscrow;
// 3. Finalize / Settle (Agent confirms data is good)
const settleTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { transactionId, status } = req.body;
    try {
        const tx = yield context_1.prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== 'PENDING') {
            res.status(400).json({ error: "Invalid Transaction" });
            return;
        }
        if (status === 'OK') {
            // Agent is happy. Pay the Merchant.
            // 1. Execute ZK Payout to Merchant Address (Mocked)
            yield context_1.shadowPay.payoutToMerchant(tx.merchantId, tx.amount);
            // 2. Update DB
            const updated = yield context_1.prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'SETTLED' }
            });
            res.json({ success: true, status: 'SETTLED' });
        }
        else {
            res.status(400).json({ error: "Invalid Status. Use /dispute for issues." });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.settleTransaction = settleTransaction;
// 4. Dispute (Agent wants refund)
const disputeTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { transactionId, encryptedReason } = req.body;
    try {
        const tx = yield context_1.prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'REFUND_REQUESTED',
                encryptedDisputeReason: encryptedReason
            }
        });
        res.json({ success: true, status: 'REFUND_REQUESTED' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.disputeTransaction = disputeTransaction;
// 5. Merchant Resolve (Approve Refund)
const resolveDispute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { transactionId, decision } = req.body; // decision: 'REFUND' | 'REJECT'
    try {
        const tx = yield context_1.prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== 'REFUND_REQUESTED') {
            res.status(400).json({ error: "Invalid Dispute" });
            return;
        }
        if (decision === 'REFUND') {
            // Refund the Agent
            yield context_1.shadowPay.refundToAgent(tx.agentId, tx.amount);
            yield context_1.prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'REFUNDED' }
            });
            res.json({ success: true, status: 'REFUNDED' });
        }
        else {
            // Reject refund -> Pay Merchant (Simplified flow)
            yield context_1.shadowPay.payoutToMerchant(tx.merchantId, tx.amount);
            yield context_1.prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'SETTLED' } // Force settle
            });
            res.json({ success: true, status: 'SETTLED_FORCED' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.resolveDispute = resolveDispute;
