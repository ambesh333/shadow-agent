'use client';
import { useState, useEffect, Suspense } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import { Terminal, Shield, Check, Link as LinkIcon, Loader2, Play, Copy, ExternalLink, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { API_URL } from '@/lib/config';

interface PaymentRequirements {
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    payTo: string;
}

function X402DemoContent() {
    const { connected, publicKey, signMessage } = useWallet();
    const searchParams = useSearchParams();
    const [url, setUrl] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [requirements, setRequirements] = useState<PaymentRequirements | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [unlockedData, setUnlockedData] = useState<{ type: string; data: string } | null>(null);
    const [imageBlob, setImageBlob] = useState<string | null>(null);
    const [registeredUrls, setRegisteredUrls] = useState<string[]>([]);

    useEffect(() => {
        const queryUrl = searchParams.get('url');
        if (queryUrl) {
            setUrl(queryUrl);
        }

        const saved = localStorage.getItem('x402_registered_urls');
        if (saved) {
            setRegisteredUrls(JSON.parse(saved));
        }
    }, [searchParams]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} > ${msg}`]);

    const saveUrl = () => {
        if (!url || registeredUrls.includes(url)) return;
        const newUrls = [...registeredUrls, url];
        setRegisteredUrls(newUrls);
        localStorage.setItem('x402_registered_urls', JSON.stringify(newUrls));
    };

    const removeUrl = (u: string) => {
        const newUrls = registeredUrls.filter(item => item !== u);
        setRegisteredUrls(newUrls);
        localStorage.setItem('x402_registered_urls', JSON.stringify(newUrls));
    };

    const handleFetchRequirements = async () => {
        if (!url) return alert('Please enter an x402 URL');

        setIsLoading(true);
        addLog(`Fetching resource: ${url}...`);

        try {
            const res = await fetch(url);

            if (res.status === 402) {
                const data = await res.json();
                addLog('Status 402: Payment Required');
                setRequirements(data.paymentRequirements);
                addLog(`Price: ${data.paymentRequirements.maxAmountRequired} SOL`);
                addLog(`Pay To: ${data.paymentRequirements.payTo.substring(0, 8)}...`);
            } else if (res.ok) {
                addLog('Status 200: Resource already accessible');
                const data = await res.json();
                setUnlockedData(data);
            } else {
                addLog(`Error: ${res.status} ${res.statusText}`);
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePay = async () => {
        if (!connected || !publicKey || !signMessage || !requirements) return;

        try {
            setIsLoading(true);
            addLog('Generating Payment Payload...');

            // In a real x402 flow, the agent would generate a Groth16 ZK proof here.
            // For the demo, we sign the requirements to prove ownership and intent.
            const message = new TextEncoder().encode(JSON.stringify({
                action: 'x402_payment',
                resource: requirements.resource,
                amount: requirements.maxAmountRequired,
                nonce: Math.random().toString(36).substring(7)
            }));

            const signature = await signMessage(message);
            const signatureBase64 = Buffer.from(signature).toString('base64');

            addLog('Signature generated successfully.');
            addLog('Sending X-Payment header to gateway...');

            const res = await fetch(url, {
                headers: {
                    'X-Payment': signatureBase64,
                    'X-Agent-Wallet': publicKey.toBase58()
                }
            });

            if (res.ok) {
                const contentType = res.headers.get('Content-Type');
                addLog(`Payment Verified! Content-Type: ${contentType}`);

                if (contentType?.includes('image')) {
                    const blob = await res.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    setImageBlob(imageUrl);
                    setUnlockedData({ type: 'IMAGE', data: 'Binary Blob' });
                } else {
                    const data = await res.json();
                    setUnlockedData(data);
                }
                setRequirements(null);
            } else {
                const error = await res.json();
                addLog(`Payment Failed: ${error.error || res.statusText}`);
                if (error.reason) addLog(`Reason: ${error.reason}`);
            }
        } catch (e: any) {
            addLog(`Payment Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 font-mono">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-blue-500 flex items-center gap-3 italic">
                            <Terminal size={32} /> AGENT_X402_SIMULATOR
                        </h1>
                        <p className="text-gray-500 text-xs mt-1 font-bold">MODE: INTERACTIVE_PAYMENT_DEBUGGER</p>
                    </div>
                    {!connected ? (
                        <div className="text-red-400 bg-red-400/10 border border-red-400/30 px-4 py-2 rounded text-sm font-bold animate-pulse">
                            WALLET DISCONNECTED
                        </div>
                    ) : (
                        <div className="text-green-400 bg-green-400/10 border border-green-400/30 px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                            <Check size={16} /> {publicKey?.toBase58().substring(0, 6)}...{publicKey?.toBase58().substring(40)}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Input & Control */}
                    <div className="space-y-6">
                        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-300">
                                <LinkIcon size={20} className="text-blue-500" /> Target Resource URL
                            </h2>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Paste x402 gateway URL here..."
                                    className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                                />
                                <button
                                    onClick={saveUrl}
                                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-all"
                                    title="Save to list"
                                >
                                    <Plus size={18} />
                                </button>
                                <button
                                    onClick={handleFetchRequirements}
                                    disabled={isLoading || !url}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} Fetch
                                </button>
                            </div>

                            {/* Registered URLs List */}
                            {registeredUrls.length > 0 && (
                                <div className="mt-6 space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-600 px-2 tracking-widest">Saved Resources</label>
                                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                        {registeredUrls.map((u, i) => (
                                            <div key={i} className="flex items-center gap-2 group bg-black/40 hover:bg-blue-600/5 p-2 rounded-lg border border-gray-800/50 hover:border-blue-500/20 transition-all">
                                                <button
                                                    onClick={() => setUrl(u)}
                                                    className="flex-1 text-left text-[11px] text-gray-500 hover:text-blue-400 truncate"
                                                >
                                                    {u}
                                                </button>
                                                <button
                                                    onClick={() => removeUrl(u)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-[10px] text-gray-500 mt-3 italic">
                                Tip: Copy this from your Merchant Dashboard &rarr; My Resources
                            </p>
                        </div>

                        {requirements && (
                            <div className="bg-blue-600/5 border border-blue-500/30 p-8 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-xl font-bold mb-6 text-blue-400">Payment Requirements</h3>
                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between border-b border-gray-800 pb-2">
                                        <span className="text-gray-500 text-xs">AMOUNT DUE</span>
                                        <span className="text-green-400 font-bold">{requirements.maxAmountRequired} SOL</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-800 pb-2">
                                        <span className="text-gray-500 text-xs">RESOURCE</span>
                                        <span className="text-gray-300 text-xs truncate max-w-[200px]">{requirements.description}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-800 pb-2">
                                        <span className="text-gray-500 text-xs">ESCROW WALLET</span>
                                        <code className="text-[10px] text-blue-300">{requirements.payTo}</code>
                                    </div>
                                </div>
                                <button
                                    onClick={handlePay}
                                    disabled={isLoading || !connected}
                                    className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-black text-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-green-600/20"
                                >
                                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Shield size={24} />}
                                    {connected ? 'AUTHORIZE & PAY' : 'CONNECT WALLET TO PAY'}
                                </button>
                            </div>
                        )}

                        {unlockedData && (
                            <div className="bg-green-500/5 border border-green-500/30 p-8 rounded-2xl">
                                <h3 className="text-xl font-bold mb-6 text-green-400 flex items-center gap-2">
                                    <Check size={24} /> Access Granted
                                </h3>

                                {imageBlob ? (
                                    <div className="relative group">
                                        <img src={imageBlob} alt="Unlocked" className="w-full rounded-lg border border-gray-800 shadow-2xl" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                            <ImageIcon size={48} className="text-green-400" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-black p-4 rounded-lg border border-gray-800 overflow-x-auto">
                                        <pre className="text-xs text-green-300">
                                            {JSON.stringify(unlockedData, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                <button
                                    onClick={() => { setUnlockedData(null); setImageBlob(null); }}
                                    className="w-full mt-6 py-2 border border-gray-700 rounded-lg text-gray-500 hover:text-white hover:border-gray-500 transition-all text-xs"
                                >
                                    DISMISS DATA
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Terminal Logs */}
                    <div className="flex flex-col h-[700px] bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="bg-gray-900/50 px-4 py-2 border-b border-gray-800 flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase">
                            <span>Diagnostic Engine</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> LIVE</span>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto space-y-2 scrollbar-hide">
                            {logs.map((log, i) => (
                                <div key={i} className="text-[12px] animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="text-gray-600 mr-2">[{log.split(' > ')[0]}]</span>
                                    <span className={
                                        log.includes('Error') || log.includes('Failed') ? 'text-red-400' :
                                            log.includes('Success') || log.includes('Verified') ? 'text-green-400 font-bold' :
                                                log.includes('402') ? 'text-yellow-400 font-bold' :
                                                    'text-gray-300'
                                    }>
                                        {log.split(' > ')[1]}
                                    </span>
                                </div>
                            ))}
                            {logs.length === 0 && <div className="text-gray-700 italic">No activity logs...</div>}
                        </div>
                        <div className="p-4 bg-gray-900/30 border-t border-gray-800">
                            <button
                                onClick={() => setLogs([])}
                                className="text-[10px] text-gray-600 hover:text-gray-400 flex items-center gap-1 transition-colors"
                            >
                                <RefreshCw size={10} /> CLEAR_LOGS
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function X402DemoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        }>
            <X402DemoContent />
        </Suspense>
    );
}

function RefreshCw({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
    )
}
