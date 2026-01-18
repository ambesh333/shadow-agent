'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Mock Type
interface Dispute {
    id: string;
    transactionId: string;
    agentId: string;
    amount: number;
    encryptedReason: string;
}

export default function DisputesPage() {
    const [disputes, setDisputes] = useState<Dispute[]>([]);

    useEffect(() => {
        // Mock fetch
        setDisputes([
            {
                id: 'disp-1',
                transactionId: 'tx-5555-5555',
                agentId: 'agent-gamma-3',
                amount: 10.00,
                encryptedReason: 'Encrypted: Bad Data Quality...'
            }
        ]);
    }, []);

    const handleResolve = async (id: string, decision: 'REFUND' | 'REJECT') => {
        console.log(`Resolving dispute ${id} with ${decision}`);
        // Call backend API /admin/resolve
        alert(`Dispute ${decision}ED`);
        setDisputes(prev => prev.filter(d => d.id !== id));
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <AlertTriangle className="text-red-500" size={32} />
                <div>
                    <h2 className="text-3xl font-bold text-white">Disputes Resolution</h2>
                    <p className="text-gray-400 text-sm">Review claims from Agents and manage refunds.</p>
                </div>
            </div>

            <div className="space-y-4">
                {disputes.map((dispute) => (
                    <div key={dispute.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex justify-between items-center hover:border-gray-600 transition-colors">
                        <div>
                            <div className="flex gap-4 mb-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-700 text-gray-300">TX: {dispute.transactionId}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-900/30 text-blue-400">Agent: {dispute.agentId}</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">Reason (Encrypted):</p>
                            <div className="bg-gray-950 p-3 rounded-lg text-xs font-mono text-yellow-500 w-96 truncate border border-gray-800">
                                {dispute.encryptedReason}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                            <span className="text-2xl font-bold text-white">${dispute.amount.toFixed(2)}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleResolve(dispute.transactionId, 'REFUND')}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors"
                                >
                                    <CheckCircle size={16} /> Approve Refund
                                </button>
                                <button
                                    onClick={() => handleResolve(dispute.transactionId, 'REJECT')}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition-colors"
                                >
                                    <XCircle size={16} /> Reject Claim
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {disputes.length === 0 && (
                    <div className="text-center py-20 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                        <p className="text-gray-500">No active disputes.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
