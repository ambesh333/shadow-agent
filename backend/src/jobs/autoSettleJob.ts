import { prisma, shadowPay } from '../context';

/**
 * Auto-settle job that runs periodically to settle expired transactions
 * Transactions past their autoSettleAt time are automatically paid to merchants
 */
export const runAutoSettle = async () => {
    try {
        const now = new Date();

        // Find all pending transactions past their auto-settle time
        const expiredTransactions = await prisma.transaction.findMany({
            where: {
                status: 'PENDING',
                autoSettleAt: {
                    lte: now
                }
            },
            include: {
                merchant: true
            }
        });

        if (expiredTransactions.length === 0) {
            return { settled: 0 };
        }

        console.log(`[AutoSettle] Found ${expiredTransactions.length} transactions to auto-settle`);

        let settledCount = 0;
        let errors: string[] = [];

        for (const tx of expiredTransactions) {
            try {
                console.log(`[AutoSettle] Settling ${tx.receiptCode} - ${tx.amount} to ${tx.merchant.walletAddress}`);

                // 1. Execute payout to merchant
                try {
                    await shadowPay.payoutToMerchant(tx.merchant.walletAddress, tx.amount);
                    console.log(`[AutoSettle] Payout successful for ${tx.receiptCode}`);
                } catch (payoutError: any) {
                    console.error(`[AutoSettle] Payout failed for ${tx.receiptCode}:`, payoutError.message);
                    // Continue to update status even if payout fails (log it)
                    errors.push(`${tx.receiptCode}: ${payoutError.message}`);
                }

                // 2. Update transaction status
                await prisma.transaction.update({
                    where: { id: tx.id },
                    data: {
                        status: 'SETTLED',
                        updatedAt: new Date()
                    }
                });

                settledCount++;
            } catch (error: any) {
                console.error(`[AutoSettle] Error settling ${tx.id}:`, error.message);
                errors.push(`${tx.id}: ${error.message}`);
            }
        }

        console.log(`[AutoSettle] Completed: ${settledCount}/${expiredTransactions.length} settled`);
        return {
            settled: settledCount,
            total: expiredTransactions.length,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (error: any) {
        console.error('[AutoSettle] Job failed:', error.message);
        return { error: error.message };
    }
};

/**
 * Start the auto-settle interval (runs every minute)
 */
export const startAutoSettleJob = (intervalMs: number = 60000) => {
    console.log(`[AutoSettle] Starting auto-settle job (interval: ${intervalMs}ms)`);

    // Run immediately once
    runAutoSettle().then(result => {
        console.log('[AutoSettle] Initial run:', result);
    });

    // Then run on interval
    const interval = setInterval(async () => {
        const result = await runAutoSettle();
        if (result.settled && result.settled > 0) {
            console.log('[AutoSettle] Run result:', result);
        }
    }, intervalMs);

    return interval;
};
