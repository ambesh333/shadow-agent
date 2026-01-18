'use client';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        escrowBalance: 0,
        activeDisputes: 0,
        totalSales: 0
    });

    // Mock data fetch
    useEffect(() => {
        // In a real app, fetch from backend via /api/auth/me or statistics endpoint
        setStats({
            escrowBalance: 250.00,
            activeDisputes: 1,
            totalSales: 1250.00
        });
    }, []);

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white">Overview</h2>
                <p className="text-gray-400">Welcome back, Merchant.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Escrow Balance */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Funds in Escrow</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-mono font-bold text-yellow-500">$</span>
                        <span className="text-4xl font-mono font-bold text-white">{stats.escrowBalance.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full w-[45%]" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Held by Facilitator temporarily</p>
                </div>

                {/* Card 2: Active Disputes */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Active Disputes</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-mono font-bold text-red-500">{stats.activeDisputes}</span>
                        <span className="text-sm text-gray-400">pending</span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full w-[10%]" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Requires your attention</p>
                </div>

                {/* Card 3: Total Sales */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Total Sales (Settled)</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-mono font-bold text-green-500">$</span>
                        <span className="text-4xl font-mono font-bold text-white">{stats.totalSales.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full w-[75%]" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Paid out to your Shadow Wallet</p>
                </div>
            </div>
        </div>
    );
}
