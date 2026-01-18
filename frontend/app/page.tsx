import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e293b,transparent_50%)] z-0" />

            <div className="z-10 flex flex-col items-center max-w-4xl text-center">
                <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium">
                    <ShieldCheck size={16} /> Privacy-First Payment Layer
                </div>

                <h1 className="text-7xl font-bold tracking-tight mb-8">
                    <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">ShadowPay</span>
                    <br />
                    <span className="text-blue-500">Facilitator</span>
                </h1>

                <p className="text-xl text-gray-400 mb-12 max-w-2xl leading-relaxed">
                    The privacy-preserving payment middleware for AI Agents.
                    <br />
                    Enable <span className="text-white font-semibold">Zero-Knowledge Settlement</span> and <span className="text-white font-semibold">Secure Escrow</span> for your data services.
                </p>

                <div className="flex gap-6">
                    <Link href="/dashboard" className="group relative w-64 p-8 bg-gray-900 hover:bg-gray-800 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300 flex flex-col items-center">
                        <div className="absolute inset-0 bg-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-gray-700">
                            <span className="text-2xl">🏢</span>
                        </div>
                        <h2 className="text-lg font-bold mb-2">Merchant Dashboard</h2>
                        <p className="text-gray-500 text-center text-sm">Manage resources, escrow, and resolve disputes.</p>
                    </Link>

                    <Link href="/demo/x402" className="group relative w-64 p-8 bg-gray-900 hover:bg-gray-800 rounded-2xl border border-blue-500/40 hover:border-blue-500/60 transition-all duration-300 flex flex-col items-center">
                        <div className="absolute inset-0 bg-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                            <span className="text-2xl">🏁</span>
                        </div>
                        <h2 className="text-lg font-bold mb-2 text-blue-400">x402 Simulator</h2>
                        <p className="text-gray-500 text-center text-sm">Interactive agent payment simulation with real wallet.</p>
                    </Link>

                    <Link href="/demo" className="group relative w-64 p-8 bg-gray-900 hover:bg-gray-800 rounded-2xl border border-gray-800 hover:border-green-500/50 transition-all duration-300 flex flex-col items-center">
                        <div className="absolute inset-0 bg-green-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-gray-700">
                            <span className="text-2xl">🤖</span>
                        </div>
                        <h2 className="text-lg font-bold mb-2">Static Demo</h2>
                        <p className="text-gray-500 text-center text-sm">Step-by-step walkthrough of the ZK payment flow.</p>
                    </Link>
                </div>
            </div>

            <div className="absolute bottom-8 text-gray-600 text-sm flex items-center gap-2">
                Powered by <span className="font-bold text-gray-500">ShadowPay Protocol</span> <Zap size={14} />
            </div>
        </div>
    );
}
