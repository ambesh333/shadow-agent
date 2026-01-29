'use client';
import { useState, useEffect } from 'react';
import { Bot, CheckCircle, XCircle, RefreshCw, Loader2, ArrowLeft, MessageSquarePlus, ArrowUpRight } from 'lucide-react';
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
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
    const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
    const [showExplanationForm, setShowExplanationForm] = useState(false);
    const [explanationText, setExplanationText] = useState('');
    const [activeStep, setActiveStep] = useState(0);

    const fetchDisputes = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/auth/disputes', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setDisputes(data.disputes);
                // Update selected dispute if exists
                if (selectedDispute) {
                    const updated = data.disputes.find((d: Dispute) => d.id === selectedDispute.id);
                    if (updated) setSelectedDispute(updated);
                }
            }
        } catch (error) {
            console.error('Failed to fetch disputes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchDisputes(); }, []);

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
            alert(`✗ AI analysis failed: ${error.message}`);
        } finally {
            setAnalyzingIds(prev => { const s = new Set(prev); s.delete(transactionId); return s; });
        }
    };

    const handleSubmitExplanation = async (transactionId: string) => {
        if (!explanationText.trim()) { alert('Please enter your explanation.'); return; }
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
                setShowExplanationForm(false);
                setExplanationText('');
                await fetchDisputes();
            } else {
                alert(`✗ Error: ${data.error}`);
            }
        } catch (error: any) {
            alert(`✗ Failed: ${error.message}`);
        } finally {
            setAnalyzingIds(prev => { const s = new Set(prev); s.delete(transactionId); return s; });
        }
    };

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
                setSelectedDispute(null);
            } else {
                alert(`✗ Error: ${data.error}`);
            }
        } catch (error: any) {
            alert(`✗ Failed: ${error.message}`);
        } finally {
            setResolvingIds(prev => { const s = new Set(prev); s.delete(transactionId); return s; });
        }
    };

    const getStatusBadge = (dispute: Dispute) => {
        if (!dispute.aiDecision) {
            return <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">Pending</span>;
        }
        if (dispute.aiDecision === 'AI_VALID') {
            return <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Valid</span>;
        }
        return <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Invalid</span>;
    };

    // ============= DETAIL CARD VIEW =============
    if (selectedDispute) {
        const dispute = disputes.find(d => d.id === selectedDispute.id) || selectedDispute;
        const isAnalyzing = analyzingIds.has(dispute.id);
        const isResolving = resolvingIds.has(dispute.id);
        const isDisputeValid = dispute.aiDecision === 'AI_VALID';
        const confidence = dispute.aiConfidence || 0;

        // Steps for valid dispute
        const validSteps = ['AI Analysis', 'Your Response', 'Resolution'];
        // Steps for invalid dispute
        const invalidSteps = ['AI Analysis', 'Resolution'];
        const steps = isDisputeValid ? validSteps : invalidSteps;

        return (
            <div className="min-h-screen bg-[#0a0a0a] text-[#F4F4F5] p-6 flex items-center justify-center">
                <div className="w-full max-w-lg">
                    {/* Back Button */}
                    <button
                        onClick={() => { setSelectedDispute(null); setShowExplanationForm(false); setActiveStep(0); }}
                        className="flex items-center gap-2 text-gray-500 hover:text-white mb-6 transition-colors text-sm"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Disputes</span>
                    </button>

                    {/* Main Card */}
                    <div className="relative bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0f1a0f] rounded-3xl border border-white/10 overflow-hidden">
                        {/* Glow Effect */}
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full blur-[100px] opacity-30 ${isDisputeValid ? 'bg-green-500' : 'bg-red-500'
                            }`} />

                        {/* Card Header */}
                        <div className="relative p-6 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${isDisputeValid ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                    <Bot size={18} className={isDisputeValid ? 'text-green-400' : 'text-red-400'} />
                                </div>
                                <span className="text-white font-medium">AI Insight</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1.5 bg-[#252525] rounded-full text-xs text-gray-300 border border-white/10">
                                    {dispute.resourceName}
                                </span>
                                <button className="p-2 bg-[#252525] rounded-full border border-white/10 hover:bg-[#333]">
                                    <RefreshCw size={14} className="text-gray-400" onClick={() => handleAIAnalyze(dispute.id)} />
                                </button>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="relative p-8">
                            {/* Large Confidence Percentage */}
                            <div className="mb-6">
                                <div className="flex items-start gap-2">
                                    <span className="text-7xl font-extralight text-white tracking-tight">
                                        {confidence}%
                                    </span>
                                    <ArrowUpRight size={24} className={`mt-3 ${isDisputeValid ? 'text-green-400' : 'text-red-400'}`} />
                                </div>
                            </div>

                            {/* Status Text */}
                            <div className="mb-4">
                                <span className="text-white font-medium">
                                    {isDisputeValid ? 'Dispute is valid' : 'Dispute is invalid'}
                                </span>
                                <span className="text-gray-500"> based on AI analysis.</span>
                            </div>

                            {/* Reasoning - Fading Text */}
                            <p className="text-gray-600 text-sm leading-relaxed mb-8">
                                {dispute.aiReasoning}
                            </p>

                            {/* Merchant Explanation (if exists) */}
                            {dispute.merchantExplanation && (
                                <div className="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                    <div className="text-xs text-blue-400 mb-2">Your Response:</div>
                                    <p className="text-sm text-blue-300">{dispute.merchantExplanation}</p>
                                </div>
                            )}

                            {/* Explanation Form */}
                            {showExplanationForm && isDisputeValid && (
                                <div className="mb-6 space-y-3">
                                    <textarea
                                        value={explanationText}
                                        onChange={(e) => setExplanationText(e.target.value)}
                                        placeholder="Explain why this dispute should be reconsidered..."
                                        className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:border-green-500/50 focus:outline-none resize-none"
                                        rows={3}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSubmitExplanation(dispute.id)}
                                            disabled={isAnalyzing}
                                            className="flex-1 py-3 bg-[#252525] hover:bg-[#333] text-white text-sm font-medium rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all"
                                        >
                                            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                            Submit & Re-analyze
                                        </button>
                                        <button
                                            onClick={() => { setShowExplanationForm(false); setExplanationText(''); }}
                                            className="px-4 py-3 bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 text-sm rounded-xl border border-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {!showExplanationForm && (
                                <div className="flex gap-3">
                                    {isDisputeValid ? (
                                        <>
                                            {/* Valid Dispute: Your Reason + Approve Refund */}
                                            {!dispute.merchantExplanation && (
                                                <button
                                                    onClick={() => setShowExplanationForm(true)}
                                                    className="flex-1 py-3.5 bg-[#252525] hover:bg-[#333] text-white text-sm font-medium rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <MessageSquarePlus size={16} />
                                                    Your Reason
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleResolve(dispute.id, 'APPROVE')}
                                                disabled={isResolving}
                                                className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/30"
                                            >
                                                {isResolving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                                Approve Refund
                                            </button>
                                        </>
                                    ) : (
                                        /* Invalid Dispute: Just Reject Claim */
                                        <button
                                            onClick={() => handleResolve(dispute.id, 'REJECT')}
                                            disabled={isResolving}
                                            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/30"
                                        >
                                            {isResolving ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                            Reject Claim
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Step Carousel */}
                        <div className="relative px-8 pb-6">
                            <div className="flex items-center justify-center gap-2">
                                {steps.map((step, index) => (
                                    <div
                                        key={step}
                                        className={`h-1 rounded-full transition-all ${index === 0
                                                ? 'w-8 bg-white'
                                                : 'w-4 bg-gray-700'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Amount Info */}
                    <div className="mt-4 text-center">
                        <span className="text-gray-500 text-sm">Dispute Amount: </span>
                        <span className="text-white font-mono font-medium">{dispute.amount.toFixed(4)} SOL</span>
                    </div>
                </div>
            </div>
        );
    }

    // ============= TABLE VIEW =============
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#F4F4F5] p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <h2 className="text-xl font-semibold text-white">Active Disputes</h2>
                <span className="text-gray-500 text-sm">{disputes.length} Disputes</span>
            </div>

            {/* Table */}
            <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[60px_1fr_1fr_120px_120px_140px] gap-4 px-6 py-4 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                    <div>No</div>
                    <div>Agent</div>
                    <div>Resource</div>
                    <div>Amount</div>
                    <div>Status</div>
                    <div className="text-right">Action</div>
                </div>

                {/* Table Body */}
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-500">Loading disputes...</p>
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="p-12 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto text-green-500/30 mb-3" />
                        <p className="text-gray-500">No active disputes</p>
                    </div>
                ) : (
                    disputes.map((dispute, index) => {
                        const isAnalyzing = analyzingIds.has(dispute.id);
                        return (
                            <div
                                key={dispute.id}
                                className="grid grid-cols-[60px_1fr_1fr_120px_120px_140px] gap-4 px-6 py-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center"
                            >
                                {/* Number */}
                                <div className="text-2xl font-bold text-gray-600 font-mono">
                                    {String(index + 1).padStart(2, '0')}
                                </div>

                                {/* Agent */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFB657] to-[#FF5832] flex items-center justify-center text-black font-bold text-xs">
                                        {dispute.agentId.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-mono text-sm text-white">
                                            {dispute.agentId.slice(0, 4)}...{dispute.agentId.slice(-4)}
                                        </div>
                                        <div className="text-xs text-gray-500">Agent Wallet</div>
                                    </div>
                                </div>

                                {/* Resource */}
                                <div>
                                    <div className="text-sm text-white">{dispute.resourceName}</div>
                                    <div className="text-xs text-gray-500">#{dispute.receiptCode || dispute.id.slice(0, 6)}</div>
                                </div>

                                {/* Amount */}
                                <div className="font-mono text-white font-medium">
                                    {dispute.amount.toFixed(4)}
                                    <span className="text-gray-500 text-xs ml-1">SOL</span>
                                </div>

                                {/* Status */}
                                <div>{getStatusBadge(dispute)}</div>

                                {/* Action */}
                                <div className="text-right">
                                    <button
                                        onClick={() => dispute.aiDecision ? setSelectedDispute(dispute) : handleAIAnalyze(dispute.id)}
                                        disabled={isAnalyzing}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dispute.aiDecision
                                                ? 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10'
                                                : 'bg-[#1a1a1a] hover:bg-[#252525] text-gray-200 border border-white/10 hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                            }`}
                                    >
                                        {isAnalyzing ? (
                                            <Loader2 size={14} className="animate-spin mx-auto" />
                                        ) : dispute.aiDecision ? (
                                            'View'
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Bot size={14} />
                                                Analyse
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
