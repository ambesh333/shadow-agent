/**
 * AI Dispute Resolution Controller
 * 
 * Handles AI-powered dispute analysis and resolution endpoints.
 */

import { Request, Response } from 'express';
import { prisma } from '../context';
import { analyzeDispute, AnalysisInput } from '../services/aiDisputeService';
import { decryptDisputeMessage } from '../clients/encryption';
import { generateRangeProof } from '../clients/shadowWireClient';
import { TokenUtils } from '../clients/tokens';

const FACILITATOR_WALLET = process.env.FACILITATOR_WALLET_ADDRESS;
const SHADOWPAY_API_URL = process.env.SHADOWPAY_API_URL || 'https://shadow.radr.fun/shadowpay';
const SHADOWPAY_API_KEY = process.env.SHADOWPAY_API_KEY;

/**
 * POST /api/disputes/:transactionId/ai-analyze
 * Trigger AI analysis for a disputed transaction
 */
export const aiAnalyzeDispute = async (req: Request, res: Response) => {
    try {
        const transactionId = req.params.transactionId as string;
        const merchantId = (req as any).merchantId;

        // 1. Find the transaction with relations
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                merchant: true,
                resource: true
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // 2. Verify merchant owns this transaction
        if (transaction.merchantId !== merchantId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // 3. Check transaction is in dispute
        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: 'Transaction is not in dispute status' });
        }

        // 4. Decrypt dispute reason if encrypted
        let disputeReason = transaction.encryptedDisputeReason || '';
        if (disputeReason) {
            const decrypted = decryptDisputeMessage(disputeReason);
            if (decrypted) {
                disputeReason = decrypted;
            } else {
                try {
                    disputeReason = Buffer.from(disputeReason, 'base64').toString('utf-8');
                } catch {
                    // Keep as-is
                }
            }
        }

        // 5. Build analysis input
        const resource = transaction.resource;
        const analysisInput: AnalysisInput = {
            disputeReason,
            resourceTitle: resource?.title || 'Unknown Resource',
            resourceDescription: resource?.description || undefined,
            resourceType: (resource?.type || 'TEXT') as any,
            resourceContent: resource?.imageData || resource?.url || transaction.dataPayload || undefined,
            merchantExplanation: transaction.merchantExplanation || undefined
        };

        // 6. Run AI analysis
        console.log(`Starting AI analysis for dispute: ${transactionId}`);
        const verdict = await analyzeDispute(analysisInput);
        console.log(`AI verdict for ${transactionId}:`, verdict);

        // 7. Update transaction with AI decision
        const updatedTx = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                aiDecision: verdict.isValid ? 'AI_VALID' : 'AI_INVALID',
                aiReasoning: verdict.reasoning,
                aiConfidence: verdict.confidence,
                aiAnalyzedAt: new Date()
            }
        });

        return res.json({
            success: true,
            verdict: {
                isValid: verdict.isValid,
                reasoning: verdict.reasoning,
                confidence: verdict.confidence
            },
            transactionId: updatedTx.id
        });

    } catch (error: any) {
        console.error('AI analyze error:', error);
        return res.status(500).json({ error: error.message || 'AI analysis failed' });
    }
};

/**
 * POST /api/disputes/:transactionId/merchant-explain
 * Submit merchant explanation and trigger re-analysis
 */
export const submitMerchantExplanation = async (req: Request, res: Response) => {
    try {
        const transactionId = req.params.transactionId as string;
        const { explanation } = req.body;
        const merchantId = (req as any).merchantId;

        if (!explanation || typeof explanation !== 'string') {
            return res.status(400).json({ error: 'Explanation is required' });
        }

        // 1. Find transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                merchant: true,
                resource: true
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // 2. Verify authorization
        if (transaction.merchantId !== merchantId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // 3. Must be in dispute
        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: 'Transaction is not in dispute' });
        }

        // 4. Store merchant explanation
        await prisma.transaction.update({
            where: { id: transactionId },
            data: { merchantExplanation: explanation }
        });

        // 5. Re-run AI analysis with merchant explanation
        let disputeReason = transaction.encryptedDisputeReason || '';
        if (disputeReason) {
            const decrypted = decryptDisputeMessage(disputeReason);
            if (decrypted) {
                disputeReason = decrypted;
            } else {
                try {
                    disputeReason = Buffer.from(disputeReason, 'base64').toString('utf-8');
                } catch { }
            }
        }

        const resource = transaction.resource;
        const analysisInput: AnalysisInput = {
            disputeReason,
            resourceTitle: resource?.title || 'Unknown Resource',
            resourceDescription: resource?.description || undefined,
            resourceType: (resource?.type || 'TEXT') as any,
            resourceContent: resource?.imageData || resource?.url || transaction.dataPayload || undefined,
            merchantExplanation: explanation
        };

        console.log(`Re-analyzing dispute ${transactionId} with merchant explanation`);
        const verdict = await analyzeDispute(analysisInput);
        console.log(`Updated AI verdict for ${transactionId}:`, verdict);

        // 6. Update transaction with new AI decision
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                aiDecision: verdict.isValid ? 'AI_VALID' : 'AI_INVALID',
                aiReasoning: verdict.reasoning,
                aiConfidence: verdict.confidence,
                aiAnalyzedAt: new Date()
            }
        });

        return res.json({
            success: true,
            verdict: {
                isValid: verdict.isValid,
                reasoning: verdict.reasoning,
                confidence: verdict.confidence
            },
            message: 'Dispute re-analyzed with your explanation'
        });

    } catch (error: any) {
        console.error('Merchant explain error:', error);
        return res.status(500).json({ error: error.message || 'Re-analysis failed' });
    }
};

/**
 * POST /api/disputes/:transactionId/resolve
 * Final resolution - approve refund or reject claim
 */
export const resolveAIDispute = async (req: Request, res: Response) => {
    try {
        const transactionId = req.params.transactionId as string;
        const { decision } = req.body; // 'APPROVE' (refund to agent) or 'REJECT' (pay merchant)
        const merchantId = (req as any).merchantId;

        if (!['APPROVE', 'REJECT'].includes(decision)) {
            return res.status(400).json({ error: 'Decision must be APPROVE or REJECT' });
        }

        // 1. Find transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { merchant: true }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // 2. Verify authorization
        if (transaction.merchantId !== merchantId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // 3. Must be in dispute
        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: 'Transaction is not in dispute' });
        }

        // 4. Perform fund transfer
        const amountSOL = transaction.amount;
        const amountSmallestUnit = TokenUtils.toSmallestUnit(amountSOL, 'SOL');
        const nonce = Math.floor(Date.now() / 1000);

        // APPROVE = refund to agent, REJECT = pay merchant
        const recipientWallet = decision === 'APPROVE'
            ? transaction.agentId
            : transaction.merchant.walletAddress;

        console.log(`Resolving dispute ${transactionId}: ${decision} -> ${recipientWallet}`);

        try {
            const proof = await generateRangeProof(amountSmallestUnit, 64);

            const requestData = {
                sender_wallet: FACILITATOR_WALLET || '',
                recipient_wallet: recipientWallet,
                token: 'SOL',
                nonce: nonce,
                amount: amountSmallestUnit,
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
                apiResult = await performTransfer(true);
            } catch (error: any) {
                if (error.message.includes('Recipient not found') || error.message.includes('404')) {
                    console.log('Recipient not found internally, attempting external transfer...');
                    apiResult = await performTransfer(false);
                } else {
                    throw error;
                }
            }

            console.log(`ShadowPay ${decision} Transfer Success:`, apiResult);

            // 5. Update transaction status
            const finalStatus = decision === 'APPROVE' ? 'REFUNDED' : 'SETTLED';
            const updatedTx = await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: finalStatus }
            });

            return res.json({
                success: true,
                status: updatedTx.status,
                txSignature: apiResult.tx_signature || 'pending',
                message: decision === 'APPROVE'
                    ? 'Dispute approved. Refund sent to agent.'
                    : 'Dispute rejected. Funds released to merchant.'
            });

        } catch (error: any) {
            console.error(`Transfer failed:`, error.message);
            return res.status(502).json({
                error: 'Transfer failed',
                details: error.message
            });
        }

    } catch (error: any) {
        console.error('Resolve dispute error:', error);
        return res.status(500).json({ error: error.message || 'Resolution failed' });
    }
};
