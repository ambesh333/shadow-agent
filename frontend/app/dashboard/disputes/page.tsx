'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, Bot, CheckCircle, XCircle, Lock, Unlock, RefreshCw, MessageSquare, Loader2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

interface Dispute {
    id: string;
    transactionId: string;
    agentId: string;
    amount: number;
    encryptedReason: string;
    resourceName: string;
    createdAt: string;
    receiptCode: string | null;
    // AI Decision Fields
    aiDecision: 'AI_VALID' | 'AI_INVALID' | null;
    aiReasoning: string | null;
    aiConfidence: number | null;
    aiAnalyzedAt: string | null;
    merchantExplanation: string | null;
}

export default function DisputesPage() {
    const { publicKey, signMessage, connected } = useWallet();
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [decryptedReasons, setDecryptedReasons] = useState<Record<string, string>>({});
    const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
    const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
    const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);
    const [explanationText, setExplanationText] = useState('');

    const fetchDisputes = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/auth/disputes', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setDisputes(data.disputes);
            }
        } catch (error) {
            console.error('Failed to fetch disputes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDisputes();
    }, []);

    // Decrypt dispute reason (for viewing)
    const handleDecrypt = async (id: string, encryptedText: string) => {
        if (!connected || !publicKey || !signMessage) {
            alert('Please connect your wallet to decrypt dispute reasons.');
            return;
        }

        try {
            const message = `Authorize decryption of dispute reason for transaction ${id}\nNonce: ${Date.now()}`;
            const messageBytes = new TextEncoder().encode(message);
            const signatureBytes = await signMessage(messageBytes);
            const signature = bs58.encode(signatureBytes);

            const response = await fetch('http://localhost:3001/api/escrow/decrypt-dispute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    transactionId: id,
                    walletAddress: publicKey.toBase58(),
                    signature: signature,
                    message: message
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setDecryptedReasons(prev => ({ ...prev, [id]: data.reason }));
            } else {
                alert(`✗ Error: ${data.error || 'Failed to decrypt'}`);
            }
        } catch (e: any) {
            console.error('Decryption failed:', e);
            alert(`✗ Decryption failed: ${e.message || 'Unknown error'}`);
        }
    };

    // Trigger AI analysis
    const handleAIAnalyze = async (transactionId: string) => {
        setAnalyzingIds(prev => new Set(prev).add(transactionId));

        try {
            const response = await fetch(`http://localhost:3001/api/disputes/${transactionId}/ai-analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await fetchDisputes();
            } else {
                alert(`✗ AI Analysis failed: ${data.error}`);
            }
        } catch (error: any) {
            console.error('AI analysis error:', error);
            alert(`✗ AI analysis failed: ${error.message}`);
        } finally {
            setAnalyzingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(transactionId);
                return newSet;
            });
        }
    };

    // Submit merchant explanation
    const handleSubmitExplanation = async (transactionId: string) => {
        if (!explanationText.trim()) {
            alert('Please enter your explanation.');
            return;
        }

        setAnalyzingIds(prev => new Set(prev).add(transactionId));

        try {
            const response = await fetch(`http://localhost:3001/api/disputes/${transactionId}/merchant-explain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ explanation: explanationText })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setExpandedExplanation(null);
                setExplanationText('');
                await fetchDisputes();
            } else {
                alert(`✗ Error: ${data.error}`);
            }
        } catch (error: any) {
            console.error('Explanation error:', error);
            alert(`✗ Failed to submit explanation: ${error.message}`);
        } finally {
            setAnalyzingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(transactionId);
                return newSet;
            });
        }
    };

    // Resolve dispute (approve or reject)
    const handleResolve = async (transactionId: string, decision: 'APPROVE' | 'REJECT') => {
        setResolvingIds(prev => new Set(prev).add(transactionId));

        try {
            const response = await fetch(`http://localhost:3001/api/disputes/${transactionId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ decision })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert(`✓ ${data.message}`);
                setDisputes(prev => prev.filter(d => d.id !== transactionId));
            } else {
                alert(`✗ Error: ${data.error}`);
            }
        } catch (error: any) {
            console.error('Resolve error:', error);
            alert(`✗ Failed to resolve dispute: ${error.message}`);
        } finally {
            setResolvingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(transactionId);
                return newSet;
            });
        }
    };

    const getAIDecisionStyle = (decision: string | null) => {
        if (decision === 'AI_VALID') return 'bg-green-900/30 border-green-500/40 text-green-400';
        if (decision === 'AI_INVALID') return 'bg-red-900/30 border-red-500/40 text-red-400';
        return 'bg-gray-900/30 border-gray-500/40 text-gray-400';
    };

    return (
        <div className="min-h-screen bg-[#000000] text-[#F4F4F5] p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-gradient-to-br from-[#FF5832]/20 to-purple-500/20 rounded-xl border border-[#FF5832]/30">
                    <Bot className="text-[#FF8E40]" size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-[#FF8E40] via-[#FF5832] to-purple-400 bg-clip-text text-transparent">
                        AI Dispute Resolution
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        AI-powered analysis. Click Analyse to get recommendations.
                    </p>
                </div>
            </div>

            {/* Disputes List */}
            <div className="space-y-6">
                {isLoading ? (
                    <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#FFB657] mb-3" />
                        <div className="text-[#FFB657]">Loading disputes...</div>
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4 opacity-50" />
                        <p className="text-gray-500">No active disputes. All clear!</p>
                    </div>
                ) : (
                    disputes.map((dispute) => {
                        const isAnalyzing = analyzingIds.has(dispute.id);
                        const isResolving = resolvingIds.has(dispute.id);
                        const hasAIDecision = !!dispute.aiDecision;
                        const isDisputeValid = dispute.aiDecision === 'AI_VALID';

                        return (
                            <div
                                key={dispute.id}
                                className="bg-gradient-to-br from-[#0a0a0a] to-[#1a0f08] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FF8E40]/30 transition-all duration-300"
                            >
                                {/* Card Header */}
                                <div className="p-6 border-b border-white/5">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-wrap gap-2 text-xs font-mono">
                                            <span className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-gray-400">
                                                #{dispute.receiptCode || dispute.transactionId.slice(0, 8)}
                                            </span>
                                            <span className="px-3 py-1.5 bg-[#FFB657]/10 rounded-lg border border-[#FFB657]/20 text-[#FFB657]">
                                                Agent: {dispute.agentId.slice(0, 6)}...{dispute.agentId.slice(-4)}
                                            </span>
                                            <span className="px-3 py-1.5 bg-blue-900/20 rounded-lg border border-blue-800/30 text-blue-400">
                                                {dispute.resourceName}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500 uppercase tracking-wide">Amount</div>
                                            <div className="text-2xl font-bold font-mono text-[#F4F4F5]">
                                                {dispute.amount.toFixed(4)} <span className="text-sm text-gray-500">SOL</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* No AI Decision Yet - Show Analyse Button */}
                                {!hasAIDecision && (
                                    <div className="p-6">
                                        <div className="flex flex-col items-center justify-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-4" />
                                                    <p className="text-gray-300 font-medium">AI is analyzing the dispute...</p>
                                                    <p className="text-gray-500 text-sm mt-1">This may take a few seconds</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Bot className="w-12 h-12 text-gray-600 mb-4" />
                                                    <p className="text-gray-400 mb-4">Click to start AI analysis</p>
                                                    <button
                                                        onClick={() => handleAIAnalyze(dispute.id)}
                                                        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-[#FF5832] hover:from-purple-400 hover:to-[#FF8E40] text-white font-bold text-lg rounded-xl shadow-lg shadow-purple-900/30 flex items-center gap-3 transition-all"
                                                    >
                                                        <Bot size={20} />
                                                        Analyse
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* AI Decision Available - Show Full UI */}
                                {hasAIDecision && (
                                    <>
                                        {/* AI Analysis Result */}
                                        <div className="p-6 border-b border-white/5">
                                            <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                                                <Bot size={14} className="text-purple-400" />
                                                <span className="font-medium">AI Analysis</span>
                                            </div>
                                            <div className={`p-5 rounded-xl border ${getAIDecisionStyle(dispute.aiDecision)}`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        {isDisputeValid ? (
                                                            <CheckCircle className="w-6 h-6 text-green-400" />
                                                        ) : (
                                                            <XCircle className="w-6 h-6 text-red-400" />
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-lg">
                                                                {isDisputeValid ? 'Dispute Valid' : 'Dispute Invalid'}
                                                            </div>
                                                            <div className="text-sm opacity-70">
                                                                {dispute.aiConfidence}% confidence
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAIAnalyze(dispute.id)}
                                                        disabled={isAnalyzing}
                                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                        title="Re-analyze"
                                                    >
                                                        <RefreshCw size={16} className={isAnalyzing ? 'animate-spin' : ''} />
                                                    </button>
                                                </div>
                                                <p className="text-sm opacity-90 leading-relaxed">
                                                    {dispute.aiReasoning}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Dispute Reason (Optional Decryption) */}
                                        <div className="p-6 border-b border-white/5">
                                            <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                                                {decryptedReasons[dispute.id] ? (
                                                    <Unlock size={14} className="text-green-400" />
                                                ) : (
                                                    <Lock size={14} className="text-gray-500" />
                                                )}
                                                <span className="font-medium">Dispute Reason</span>
                                                {!decryptedReasons[dispute.id] && (
                                                    <button
                                                        onClick={() => handleDecrypt(dispute.id, dispute.encryptedReason)}
                                                        className="ml-2 text-xs text-[#FF8E40] hover:underline"
                                                    >
                                                        (click to decrypt)
                                                    </button>
                                                )}
                                            </div>
                                            <div className={`p-4 rounded-xl font-mono text-sm border ${decryptedReasons[dispute.id]
                                                    ? 'bg-green-900/10 border-green-500/20 text-[#F4F4F5]'
                                                    : 'bg-black/30 border-white/10 text-gray-500 italic'
                                                }`}>
                                                {decryptedReasons[dispute.id] || 'Encrypted - click to reveal'}
                                            </div>
                                        </div>

                                        {/* Merchant Explanation Section */}
                                        <div className="p-6 border-b border-white/5">
                                            <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                                                <MessageSquare size={14} className="text-blue-400" />
                                                <span className="font-medium">Your Response</span>
                                            </div>

                                            {dispute.merchantExplanation ? (
                                                <div className="p-4 bg-blue-900/20 rounded-xl border border-blue-500/20 text-blue-300 text-sm">
                                                    {dispute.merchantExplanation}
                                                </div>
                                            ) : expandedExplanation === dispute.id ? (
                                                <div className="space-y-3">
                                                    <textarea
                                                        value={explanationText}
                                                        onChange={(e) => setExplanationText(e.target.value)}
                                                        placeholder="Explain why this dispute should be reconsidered..."
                                                        className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-sm text-[#F4F4F5] placeholder-gray-500 focus:border-blue-500/50 focus:outline-none resize-none"
                                                        rows={3}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleSubmitExplanation(dispute.id)}
                                                            disabled={isAnalyzing}
                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
                                                        >
                                                            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                            Submit & Re-analyze
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setExpandedExplanation(null);
                                                                setExplanationText('');
                                                            }}
                                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setExpandedExplanation(dispute.id)}
                                                    className="w-full p-4 border border-dashed border-white/10 rounded-xl text-gray-500 hover:border-blue-500/30 hover:text-blue-400 transition-colors text-sm"
                                                >
                                                    + Add explanation to counter AI decision
                                                </button>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="p-6 bg-black/30">
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-gray-600">
                                                    AI recommends: {isDisputeValid ? 'Approve Refund' : 'Reject Claim'}
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleResolve(dispute.id, 'REJECT')}
                                                        disabled={isResolving}
                                                        className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${!isDisputeValid
                                                                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-900/30'
                                                                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300'
                                                            }`}
                                                    >
                                                        {isResolving ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={16} />}
                                                        Reject Claim
                                                    </button>
                                                    <button
                                                        onClick={() => handleResolve(dispute.id, 'APPROVE')}
                                                        disabled={isResolving}
                                                        className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${isDisputeValid
                                                                ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-lg shadow-green-900/30'
                                                                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300'
                                                            }`}
                                                    >
                                                        {isResolving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={16} />}
                                                        Approve Refund
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
