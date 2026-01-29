/**
 * AI Dispute Resolution Routes
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
    aiAnalyzeDispute,
    submitMerchantExplanation,
    resolveAIDispute
} from '../controllers/disputeAIController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Trigger AI analysis for a dispute
router.post('/:transactionId/ai-analyze', aiAnalyzeDispute);

// Submit merchant explanation for re-analysis
router.post('/:transactionId/merchant-explain', submitMerchantExplanation);

// Final resolution (approve/reject)
router.post('/:transactionId/resolve', resolveAIDispute);

export default router;
