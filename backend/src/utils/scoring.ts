/**
 * Trust Score Algorithms for Resources and Merchants
 * 
 * Both scores are normalized to 0-100 scale.
 * New entities start at ~50 (neutral) and move based on actual data.
 */

// =============================================================================
// RESOURCE SCORE (0-100)
// =============================================================================
// Weights:
// - Access Count:        25% (popularity signal)
// - Dispute Resolution:  40% (quality - most important)
// - Merchant Score:      25% (inherited trust)
// - Recency:             10% (freshness bonus)

interface ResourceScoreInput {
    accessCount: number;
    settledDisputes: number;      // Disputes where agent got refunded (bad for resource)
    activeDisputes: number;       // Currently pending disputes
    merchantScore: number;        // 0-100
    createdAt: Date;
    totalTransactions: number;    // Total completed transactions
}

export function calculateResourceScore(input: ResourceScoreInput): number {
    const {
        accessCount,
        settledDisputes,
        activeDisputes,
        merchantScore,
        createdAt,
        totalTransactions
    } = input;

    // === NEW RESOURCE HANDLING ===
    // If resource has < 3 accesses, return a base score with slight merchant influence
    if (accessCount < 3) {
        // Start at 50, slightly influenced by merchant score
        const merchantInfluence = (merchantScore - 50) * 0.2; // ±10 max
        return Math.round(Math.max(30, Math.min(70, 50 + merchantInfluence)));
    }

    // === WEIGHTS ===
    const WEIGHT_ACCESS = 0.25;
    const WEIGHT_DISPUTE = 0.40;
    const WEIGHT_MERCHANT = 0.25;
    const WEIGHT_RECENCY = 0.10;

    // === ACCESS SCORE (0-100) ===
    // Logarithmic scale - diminishing returns after certain thresholds
    // 10 accesses = ~40, 50 accesses = ~70, 200+ = ~100
    const accessScore = Math.min(100, Math.log10(accessCount + 1) * 43);

    // === DISPUTE SCORE (0-100) ===
    // This measures content quality but is LENIENT to account for occasional disputes
    // A 10% dispute rate (1 out of 10) should still be a good score
    // Also rewards high success rates
    const totalDisputes = settledDisputes + activeDisputes;
    const successfulTransactions = totalTransactions - totalDisputes;
    let disputeScore: number;

    if (totalTransactions === 0) {
        disputeScore = 50; // Neutral if no transactions
    } else {
        const successRate = successfulTransactions / totalTransactions;
        // Success rate based scoring (more generous):
        // 100% success = 100, 95% = 95, 90% = 85, 80% = 70, 70% = 55, 50% = 30
        disputeScore = Math.max(0, Math.min(100,
            50 + (successRate - 0.5) * 100  // Linear from 50% (0) to 100% (100)
        ));
    }

    // Small penalty for active disputes (uncertainty)
    if (activeDisputes > 0) {
        disputeScore = Math.max(0, disputeScore - (activeDisputes * 3));
    }

    // === MERCHANT SCORE (0-100) ===
    // Direct inheritance from merchant reputation
    const merchantScoreComponent = merchantScore;

    // === RECENCY SCORE (0-100) ===
    // Recent resources get a slight boost
    // Less than 7 days = 100, 30 days = 70, 90 days = 40, 180+ days = 20
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    let recencyScore: number;
    if (ageInDays < 7) {
        recencyScore = 100;
    } else if (ageInDays < 30) {
        recencyScore = 100 - ((ageInDays - 7) * 1.3);
    } else if (ageInDays < 90) {
        recencyScore = 70 - ((ageInDays - 30) * 0.5);
    } else {
        recencyScore = Math.max(20, 40 - ((ageInDays - 90) * 0.1));
    }

    // === FINAL WEIGHTED SCORE ===
    const finalScore =
        (accessScore * WEIGHT_ACCESS) +
        (disputeScore * WEIGHT_DISPUTE) +
        (merchantScoreComponent * WEIGHT_MERCHANT) +
        (recencyScore * WEIGHT_RECENCY);

    return Math.round(Math.max(0, Math.min(100, finalScore)));
}


// =============================================================================
// MERCHANT SCORE (0-100)
// =============================================================================
// Weights:
// - Resource Count:      15% (activity level)
// - Total Earnings:      20% (success indicator)
// - Dispute Loss Rate:   45% (trust - most important, inverse)
// - Account Age:         20% (established presence)

interface MerchantScoreInput {
    resourceCount: number;
    totalEarnings: number;        // In native tokens (SOL)
    totalTransactions: number;    // All transactions across all resources
    lostDisputes: number;         // Disputes where merchant lost (agent refunded)
    createdAt: Date;
}

export function calculateMerchantScore(input: MerchantScoreInput): number {
    const {
        resourceCount,
        totalEarnings,
        totalTransactions,
        lostDisputes,
        createdAt
    } = input;

    // === NEW MERCHANT HANDLING ===
    // Grace period: < 5 transactions, start neutral
    if (totalTransactions < 5) {
        // Small bonus for having resources, slight penalty for early disputes
        const resourceBonus = Math.min(10, resourceCount * 2);
        const earlyDisputePenalty = lostDisputes * 5;
        return Math.round(Math.max(30, Math.min(60, 50 + resourceBonus - earlyDisputePenalty)));
    }

    // === WEIGHTS ===
    const WEIGHT_RESOURCES = 0.15;
    const WEIGHT_EARNINGS = 0.20;
    const WEIGHT_DISPUTES = 0.45;
    const WEIGHT_AGE = 0.20;

    // === RESOURCE SCORE (0-100) ===
    // More resources = more established
    // 1-2 = 30, 5 = 60, 10 = 80, 20+ = 100
    let resourceScore: number;
    if (resourceCount <= 2) {
        resourceScore = 30 + (resourceCount * 10);
    } else if (resourceCount <= 5) {
        resourceScore = 50 + ((resourceCount - 2) * 10);
    } else if (resourceCount <= 10) {
        resourceScore = 80 + ((resourceCount - 5) * 4);
    } else {
        resourceScore = 100;
    }

    // === EARNINGS SCORE (0-100) ===
    // Logarithmic scale based on total earnings
    // 0.1 SOL = ~30, 1 SOL = ~60, 10 SOL = ~85, 100+ SOL = 100
    let earningsScore: number;
    if (totalEarnings <= 0) {
        earningsScore = 20;
    } else {
        earningsScore = Math.min(100, 30 + (Math.log10(totalEarnings + 0.1) + 1) * 35);
    }

    // === DISPUTE SCORE (0-100) ===
    // Based on SUCCESS RATE rather than just penalizing disputes
    // This gives more weight to successful transactions
    // A merchant with 9 successful and 1 dispute should still score well
    const successfulTransactions = totalTransactions - lostDisputes;
    let disputeScore: number;

    if (totalTransactions === 0) {
        disputeScore = 50; // Neutral
    } else {
        const successRate = successfulTransactions / totalTransactions;
        // Success rate based scoring (generous):
        // 100% = 100, 95% = 95, 90% = 85, 80% = 70, 70% = 55, 50% = 30
        disputeScore = Math.max(0, Math.min(100,
            50 + (successRate - 0.5) * 100
        ));
    }

    // === AGE SCORE (0-100) ===
    // Older accounts are more established
    // 0-7 days = 30, 30 days = 50, 90 days = 75, 180+ days = 100
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    let ageScore: number;
    if (ageInDays < 7) {
        ageScore = 30;
    } else if (ageInDays < 30) {
        ageScore = 30 + ((ageInDays - 7) * 0.87); // ~50 at 30 days
    } else if (ageInDays < 90) {
        ageScore = 50 + ((ageInDays - 30) * 0.42); // ~75 at 90 days
    } else if (ageInDays < 180) {
        ageScore = 75 + ((ageInDays - 90) * 0.28); // ~100 at 180 days
    } else {
        ageScore = 100;
    }

    // === FINAL WEIGHTED SCORE ===
    const finalScore =
        (resourceScore * WEIGHT_RESOURCES) +
        (earningsScore * WEIGHT_EARNINGS) +
        (disputeScore * WEIGHT_DISPUTES) +
        (ageScore * WEIGHT_AGE);

    return Math.round(Math.max(0, Math.min(100, finalScore)));
}


// =============================================================================
// SCORE LABEL / TIER
// =============================================================================

export function getScoreLabel(score: number): { label: string; color: string } {
    if (score >= 85) return { label: 'Excellent', color: '#22c55e' };    // green
    if (score >= 70) return { label: 'Good', color: '#84cc16' };         // lime
    if (score >= 55) return { label: 'Fair', color: '#eab308' };         // yellow
    if (score >= 40) return { label: 'Caution', color: '#f97316' };      // orange
    return { label: 'High Risk', color: '#ef4444' };                     // red
}
