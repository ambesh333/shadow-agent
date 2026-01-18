'use client';
import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, AlertTriangle, Settings, ArrowRight } from 'lucide-react';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { useAuth } from '@/components/AuthContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading } = useAuth();

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-950 p-6 flex flex-col border-r border-gray-800">
                <div className="flex items-center gap-2 mb-10 text-blue-400">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-blue-500 rounded-full" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">ShadowPay <span className="text-gray-500 font-normal">Fac.</span></h1>
                </div>

                <nav className="space-y-1">
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                        <LayoutDashboard size={18} /> Overview
                    </Link>
                    <Link href="/dashboard/resources" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                        <Package size={18} /> My Resources
                    </Link>
                    <Link href="/dashboard/disputes" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                        <AlertTriangle size={18} /> Disputes
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                        <Settings size={18} /> Settings
                    </Link>
                </nav>

                <div className="mt-auto pt-8 border-t border-gray-800">
                    <Link href="/demo" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg transition-colors group">
                        <span>Agent Demo</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-900">
                {/* Header with wallet connect */}
                <header className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-8 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-300">Merchant Dashboard</h2>
                    </div>
                    <ConnectWalletButton />
                </header>

                <div className="max-w-7xl mx-auto p-8">
                    {!isLoading && !isAuthenticated ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                <span className="text-4xl">🔐</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                            <p className="text-gray-400 mb-6 max-w-md">
                                Sign in with your Solana wallet to access your merchant dashboard and manage escrow, disputes, and earnings.
                            </p>
                            <ConnectWalletButton />
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </main>
        </div>
    );
}
