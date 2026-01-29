'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Lock, Unlock } from 'lucide-react';
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
}

export default function DisputesPage() {
    const { publicKey, signMessage, connected } = useWallet();
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [decryptedReasons, setDecryptedReasons] = useState<Record<string, string>>({});

    useEffect(() => {
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

        fetchDisputes();
    }, []);

    // Secure Decryption via backend using wallet signature verification
    const handleDecrypt = async (id: string, encryptedText: string) => {
        if (!connected || !publicKey || !signMessage) {
            alert('Please connect your wallet to decrypt dispute reasons.');
            return;
        }

        try {
            // 1. Create a message to sign
            const message = `Authorize decryption of dispute reason for transaction ${id}\nNonce: ${Date.now()}`;
            const messageBytes = new TextEncoder().encode(message);

            // 2. Request signature from wallet
            const signatureBytes = await signMessage(messageBytes);
            const signature = bs58.encode(signatureBytes);

            // 3. Call backend to decrypt
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

    const handleResolve = async (transactionId: string, decision: 'REFUND' | 'REJECT') => {
        try {
            const response = await fetch('http://localhost:3001/api/gateway/resolve-dispute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ transactionId, decision })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`✓ ${data.message}`);
                // Remove from list
                setDisputes(prev => prev.filter(d => d.id !== transactionId));
            } else {
                alert(`✗ Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Resolve error:', error);
            alert('✗ Failed to resolve dispute');
        }
    };

    return (
        <div className="min-h-screen bg-[#000000] text-[#F4F4F5] p-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-[#FF5832]/10 rounded-xl border border-[#FF5832]/20">
                    <AlertTriangle className="text-[#FF5832]" size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-[#F4F4F5] to-gray-500 bg-clip-text text-transparent">
                        Disputes Resolution
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Manage refund requests securely. Reasons are encrypted end-to-end.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10 animate-pulse">
                        <div className="text-[#FFB657]">Loading encrypted claims...</div>
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <p className="text-gray-500">No active disputes found.</p>
                    </div>
                ) : (
                    disputes.map((dispute) => (
                        <div
                            key={dispute.id}
                            className="group relative bg-[#1a0f08] border border-white/10 rounded-xl p-6 hover:border-[#FF8E40]/30 transition-all duration-300"
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-4 flex-1">
                                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                                        <span className="px-2 py-1 bg-white/5 rounded border border-white/10 text-gray-400">
                                            ID: {dispute.receiptCode || dispute.transactionId.slice(0, 8)}
                                        </span>
                                        <span className="px-2 py-1 bg-[#FFB657]/10 rounded border border-[#FFB657]/20 text-[#FFB657]">
                                            Agent: {dispute.agentId.slice(0, 8)}...
                                        </span>
                                        <span className="px-2 py-1 bg-blue-900/20 rounded border border-blue-800/30 text-blue-400">
                                            Resource: {dispute.resourceName}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                                            {decryptedReasons[dispute.id] ? <Unlock size={14} className="text-[#27c93f]" /> : <Lock size={14} className="text-[#FF5832]" />}
                                            <span>Dispute Reason {decryptedReasons[dispute.id] ? '(Decrypted)' : '(Encrypted)'}</span>
                                        </div>

                                        <div className="relative group/reason">
                                            <div className={`p-4 rounded-lg font-mono text-xs border transition-colors ${decryptedReasons[dispute.id]
                                                ? 'bg-[#27c93f]/5 border-[#27c93f]/20 text-[#F4F4F5]'
                                                : 'bg-black border-[#FF5832]/20 text-[#FF5832] break-all'
                                                }`}>
                                                {decryptedReasons[dispute.id] || dispute.encryptedReason}
                                            </div>

                                            {!decryptedReasons[dispute.id] && (
                                                <button
                                                    onClick={() => handleDecrypt(dispute.id, dispute.encryptedReason)}
                                                    className="absolute top-2 right-2 px-3 py-1 bg-[#FF5832] hover:bg-[#B31D00] text-white text-xs font-bold rounded shadow-lg opacity-0 group-hover/reason:opacity-100 transition-opacity"
                                                >
                                                    Decrypt Data
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-4 ml-6">
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500 uppercase tracking-wide">Refund Amount</div>
                                        <div className="text-3xl font-bold font-mono text-[#F4F4F5]">${dispute.amount.toFixed(4)}</div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleResolve(dispute.transactionId, 'REJECT')}
                                            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm font-semibold transition-colors"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleResolve(dispute.transactionId, 'REFUND')}
                                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF8E40] to-[#FF5832] hover:from-[#FFB657] hover:to-[#FF8E40] text-black text-sm font-bold shadow-lg shadow-orange-900/20 transition-all"
                                        >
                                            Approve Refund
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
