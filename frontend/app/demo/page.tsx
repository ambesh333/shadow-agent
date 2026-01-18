'use client';
import { useState } from 'react';
import { API_URL } from '@/lib/config';
import { Terminal, Shield, Check, X, RefreshCw } from 'lucide-react';

export default function AgentDemoPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [step, setStep] = useState(0);
    const [txId, setTxId] = useState<string | null>(null);
    const [dataPayload, setDataPayload] = useState<string | null>(null);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} > ${msg}`]);

    // Step 1: Request Resource
    const requestResource = async () => {
        addLog('Requesting premium resource /gateway/merchant-1/ai-model-v1...');
        try {
            const res = await fetch(`${API_URL}/gateway/merchant-1/ai-model-v1`);
            if (res.status === 402) {
                const data = await res.json();
                addLog(`Received 402 Payment Required. Cost: ${data.details.amount} USDC`);
                addLog(`Facilitator Address: ${data.details.facilitator_address.substring(0, 10)}...`);
                setStep(1);
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        }
    };

    // Step 2: Pay to Escrow
    const payToEscrow = async () => {
        addLog('Generating ZK Proof (Client-side)... DONE');
        addLog('Sending Proof + Funds to Facilitator Escrow...');

        try {
            const res = await fetch(`${API_URL}/pay/escrow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proof: "zk_proof_mock_string",
                    merchantId: "merchant-1",
                    agentId: "agent-simulated-1",
                    amount: 10,
                    transactionPayload: "encrypted_tx_data"
                })
            });
            const data = await res.json();

            if (data.success) {
                addLog(`Escrow Funded! Transaction ID: ${data.transactionId}`);
                addLog(`Received Data: ${data.data}`);
                setTxId(data.transactionId);
                setDataPayload(data.data);
                setStep(2);
            } else {
                addLog(`Escrow Failed: ${data.error}`);
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        }
    };

    // Step 3: Settle
    const settle = async () => {
        addLog('Verifying Data Validity... GOOD');
        addLog(`Settling Transaction ${txId}...`);

        const res = await fetch(`${API_URL}/settle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: txId, status: 'OK' })
        });
        const data = await res.json();
        addLog(`Settlement Status: ${data.status}`);
        setStep(3);
    };

    // Step 3: Dispute
    const dispute = async () => {
        addLog('Verifying Data Validity... BAD!!');
        addLog(`Raising Dispute for Transaction ${txId}...`);

        const res = await fetch(`${API_URL}/dispute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transactionId: txId,
                encryptedReason: "ENCRYPTED_REASON_CODE_BAD_DATA"
            })
        });
        const data = await res.json();
        addLog(`Dispute Status: ${data.status}`);
        addLog('Waiting for Merchant Resolution...');
        setStep(3);
    };

    return (
        <div className="min-h-screen bg-black text-white p-8 font-mono">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold text-green-400 mb-8 border-b border-green-800 pb-4 flex items-center gap-3">
                    <Terminal size={24} /> Agent Autonomy Simulator v1.0
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <div className="bg-gray-900 border border-gray-700 p-8 rounded-xl mb-6 shadow-2xl">
                            <h2 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
                                <Shield size={20} /> Action Control
                            </h2>

                            {step === 0 && (
                                <button onClick={requestResource} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-all transform hover:scale-[1.02]">
                                    1. Request Premium Data
                                </button>
                            )}

                            {step === 1 && (
                                <button onClick={payToEscrow} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 rounded-lg font-bold text-black animate-pulse transition-all">
                                    2. Sign & Pay (ZK Proof)
                                </button>
                            )}

                            {step === 2 && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-gray-800 rounded-lg text-center border border-gray-700">
                                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Data Received</p>
                                        <p className="font-mono font-bold text-green-300 text-lg break-all">{dataPayload}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={settle} className="py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                                            <Check size={18} /> Verify & Settle
                                        </button>
                                        <button onClick={dispute} className="py-4 bg-red-600 hover:bg-red-500 rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                                            <X size={18} /> Dispute (Refund)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="p-8 bg-gray-800/50 rounded-lg text-center text-gray-400 border border-gray-700">
                                    <p className="mb-4">Session Complete.</p>
                                    <button onClick={() => window.location.reload()} className="text-white flex items-center justify-center gap-2 mx-auto hover:text-blue-400 transition-colors">
                                        <RefreshCw size={14} /> Reset Simulator
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-black border border-gray-800 p-6 rounded-xl h-[600px] overflow-y-auto font-mono text-xs shadow-inner">
                        <h3 className="text-gray-500 mb-4 uppercase tracking-wider text-[10px] font-bold">System Output</h3>
                        {logs.map((log, i) => (
                            <div key={i} className="mb-2 text-green-500/90 border-l-2 border-green-900/50 pl-3 py-1 hover:bg-green-900/10 transition-colors">
                                {log}
                            </div>
                        ))}
                        {logs.length === 0 && <span className="text-gray-700 italic">Waiting for agent activity...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
