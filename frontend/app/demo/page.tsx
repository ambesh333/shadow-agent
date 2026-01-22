'use client';

import { useState, useEffect, Suspense } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import {
    Terminal,
    Shield,
    Check,
    Link as LinkIcon,
    Loader2,
    Play,
    RefreshCw,
    Trash2,
    Image as ImageIcon,
    Plus,
} from 'lucide-react';
import { ShadowPay } from '@shadowpay/client';

interface PaymentRequirements {
    scheme: string;
    network: string;
    maxAmountRequired: string; // SOL (string)
    resource: string;
    description: string;
    payTo: string; // merchant public key
}

function X402DemoContent() {
    const wallet = useWallet();
    const { connected, publicKey } = wallet;
    const searchParams = useSearchParams();

    const [url, setUrl] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [requirements, setRequirements] =
        useState<PaymentRequirements | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [unlockedData, setUnlockedData] = useState<any>(null);
    const [imageBlob, setImageBlob] = useState<string | null>(null);
    const [registeredUrls, setRegisteredUrls] = useState<string[]>([]);

    useEffect(() => {
        const q = searchParams.get('url');
        if (q) setUrl(q);

        const saved = localStorage.getItem('x402_registered_urls');
        if (saved) setRegisteredUrls(JSON.parse(saved));
    }, [searchParams]);

    const log = (msg: string) =>
        setLogs((l) => [...l, `${new Date().toLocaleTimeString()} > ${msg}`]);

    const saveUrl = () => {
        if (!url || registeredUrls.includes(url)) return;
        const next = [...registeredUrls, url];
        setRegisteredUrls(next);
        localStorage.setItem('x402_registered_urls', JSON.stringify(next));
    };

    const removeUrl = (u: string) => {
        const next = registeredUrls.filter((x) => x !== u);
        setRegisteredUrls(next);
        localStorage.setItem('x402_registered_urls', JSON.stringify(next));
    };

    // -----------------------------
    // 1️⃣ Fetch resource / 402
    // -----------------------------
    const handleFetchRequirements = async () => {
        if (!url) return alert('Enter a gateway URL');

        setIsLoading(true);
        log(`Fetching ${url}`);

        try {
            const res = await fetch(url);

            if (res.status === 402) {
                const data = await res.json();
                setRequirements(data.paymentRequirements);
                log('402 Payment Required');
                log(`Amount: ${data.paymentRequirements.maxAmountRequired} SOL`);
            } else if (res.ok) {
                const data = await res.json();
                setUnlockedData(data);
                log('Resource already unlocked');
            } else {
                log(`HTTP ${res.status}`);
            }
        } catch (e: any) {
            log(`Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // -----------------------------
    // 2️⃣ Pay using NEW ShadowPay SDK
    // -----------------------------
    const handlePay = async () => {
        if (!connected || !publicKey || !requirements) return;

        const amount = Number(requirements.maxAmountRequired);
        if (amount < 0.000001) {
            log('Amount too small (must be ≥ 0.000001 SOL)');
            return;
        }

        try {
            setIsLoading(true);
            log('Starting ShadowPay x402 payment…');

            // ✅ NEW SDK — no args
            // @ts-ignore
            const sp = new ShadowPay();

            // ✅ Create x402 payment
            // @ts-ignore
            const payment = await sp.pay({
                to: requirements.payTo, // merchant pubkey
                amount,
                token: 'SOL',
                wallet,
            } as any);

            log('Payment proof generated');
            log('Sending X-Payment header…');

            // ✅ Retry gateway with X-Payment
            const res = await fetch(url, {
                headers: {
                    'X-Payment': (payment as any).header,
                },
            });

            if (!res.ok) {
                const err = await res.json();
                log(`Payment rejected: ${err.error || res.statusText}`);
                return;
            }

            const ct = res.headers.get('Content-Type');
            log(`Payment verified (${ct})`);

            if (ct?.includes('image')) {
                const blob = await res.blob();
                setImageBlob(URL.createObjectURL(blob));
                setUnlockedData({ type: 'IMAGE' });
            } else {
                const data = await res.json();
                setUnlockedData(data);
            }

            setRequirements(null);
        } catch (e: any) {
            log(`Payment error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 font-mono">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-blue-500 flex items-center gap-3 italic">
                            <Terminal size={32} /> AGENT_X402_SIMULATOR
                        </h1>
                        <p className="text-gray-500 text-xs mt-1 font-bold">
                            MODE: INTERACTIVE_PAYMENT_DEBUGGER
                        </p>
                    </div>

                    {connected ? (
                        <div className="text-green-400 bg-green-400/10 border border-green-400/30 px-4 py-2 rounded text-sm font-bold">
                            <Check size={16} /> {publicKey?.toBase58().slice(0, 6)}…
                        </div>
                    ) : (
                        <div className="text-red-400 bg-red-400/10 border border-red-400/30 px-4 py-2 rounded text-sm font-bold animate-pulse">
                            WALLET DISCONNECTED
                        </div>
                    )}
                </div>

                {/* Main */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left */}
                    <div className="space-y-6">
                        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-300">
                                <LinkIcon size={20} className="text-blue-500" />
                                Target Resource URL
                            </h2>

                            <div className="flex gap-2">
                                <input
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-sm"
                                />
                                <button onClick={saveUrl} className="p-3 bg-gray-800 rounded-lg">
                                    <Plus size={18} />
                                </button>
                                <button
                                    onClick={handleFetchRequirements}
                                    disabled={isLoading}
                                    className="px-6 py-3 bg-blue-600 rounded-lg font-bold"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" /> : <Play />}
                                </button>
                            </div>
                        </div>

                        {requirements && (
                            <div className="bg-blue-600/5 border border-blue-500/30 p-8 rounded-2xl">
                                <h3 className="text-xl font-bold mb-6 text-blue-400">
                                    Payment Required
                                </h3>

                                <div className="mb-6">
                                    <p className="text-green-400 font-bold">
                                        {requirements.maxAmountRequired} SOL
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {requirements.description}
                                    </p>
                                </div>

                                <button
                                    onClick={handlePay}
                                    disabled={!connected || isLoading}
                                    className="w-full py-4 bg-green-600 rounded-xl font-black text-lg"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin" />
                                    ) : (
                                        <Shield />
                                    )}
                                    PAY & UNLOCK
                                </button>
                            </div>
                        )}

                        {unlockedData && (
                            <div className="bg-green-500/5 border border-green-500/30 p-8 rounded-2xl">
                                <h3 className="text-xl font-bold mb-4 text-green-400">
                                    Access Granted
                                </h3>

                                {imageBlob ? (
                                    <img src={imageBlob} className="rounded-lg" />
                                ) : (
                                    <pre className="text-xs text-green-300">
                                        {JSON.stringify(unlockedData, null, 2)}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Logs */}
                    <div className="bg-black border border-gray-800 rounded-2xl p-4">
                        {logs.map((l, i) => (
                            <div key={i} className="text-xs text-gray-400">
                                {l}
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="text-gray-700 italic">No logs yet…</div>
                        )}
                        <button
                            onClick={() => setLogs([])}
                            className="mt-4 text-xs text-gray-500 flex items-center gap-1"
                        >
                            <RefreshCw size={10} /> CLEAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function X402DemoPage() {
    return (
        <Suspense fallback={<Loader2 className="animate-spin" />}>
            <X402DemoContent />
        </Suspense>
    );
}
