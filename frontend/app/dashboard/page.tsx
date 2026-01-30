'use client';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        escrowBalance: 0,
        activeDisputes: 0,
        totalSales: 0,
        resourcesAnalytics: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${API_URL}/auth/stats`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include', // Send cookies
                });

                if (response.ok) {
                    const data = await response.json();
                    setStats({
                        escrowBalance: data.escrowBalance || 0,
                        activeDisputes: data.activeDisputes || 0,
                        totalSales: data.totalSales || 0,
                        resourcesAnalytics: data.resourcesAnalytics || []
                    });
                } else {
                    console.error('Failed to fetch stats:', await response.text());
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        fetchStats();
    }, []);

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white">Overview</h2>
                <p className="text-gray-400">Welcome back, Merchant.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Escrow Balance */}
                <div className="bg-black p-6 rounded-xl shadow-lg border border-white/10 bg-gradient-to-br from-black to-[#1a0f08]">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Funds in Escrow</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-mono font-bold text-[#FFB657]">$</span>
                        <span className="text-4xl font-mono font-bold text-white">{stats.escrowBalance.toFixed(5)}</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-[#FFB657] h-full w-[45%]" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Held by Facilitator temporarily</p>
                </div>

                {/* Card 2: Active Disputes */}
                <div className="bg-black p-6 rounded-xl shadow-lg border border-white/10 bg-gradient-to-br from-black to-[#1a0f08]">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Active Disputes</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-mono font-bold text-[#FF5832]">{stats.activeDisputes}</span>
                        <span className="text-sm text-gray-400">pending</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-[#FF5832] h-full w-[10%]" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Requires your attention</p>
                </div>

                {/* Card 3: Total Sales */}
                <div className="bg-black p-6 rounded-xl shadow-lg border border-white/10 bg-gradient-to-br from-black to-[#1a0f08]">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Total Sales (Settled)</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-mono font-bold text-[#FF8E40]">$</span>
                        <span className="text-4xl font-mono font-bold text-white">{stats.totalSales.toFixed(4)}</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-[#FF8E40] h-full w-[75%]" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Paid out to your Shadow Wallet</p>
                </div>
            </div>

            {/* Merchant Resources Analytics Table */}
            <div className="mt-12">
                <h3 className="text-xl font-bold text-[#F4F4F5] mb-6">Top Performing Resources</h3>

                <div className="space-y-3">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                        <div className="col-span-1">Rank</div>
                        <div className="col-span-6">Resource</div>
                        <div className="col-span-3 text-right">Access Count</div>
                        <div className="col-span-2 text-right">Disputes</div>
                    </div>

                    {/* Data Rows */}
                    {stats.resourcesAnalytics.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 bg-black/50 rounded-xl border border-white/5">
                            No analytics data available yet.
                        </div>
                    ) : (
                        stats.resourcesAnalytics.map((resource: any, index: number) => {
                            // Calculate gradient opacity: Starts at 0.2 (20%) and fades down
                            const opacity = Math.max(0.02, 0.2 - (index * 0.03));

                            return (
                                <div
                                    key={resource.id}
                                    className="relative grid grid-cols-12 gap-4 items-center px-6 py-4 rounded-xl border border-white/5 overflow-hidden group hover:border-[#FFB657]/30 transition-colors"
                                >
                                    {/* Gradient Background Layer */}
                                    <div
                                        className="absolute inset-0 bg-gradient-to-r from-[#FF8E40] to-transparent pointer-events-none"
                                        style={{ opacity: opacity }}
                                    />

                                    <div className="col-span-1 relative z-10 font-mono text-gray-400">
                                        #{index + 1}
                                    </div>
                                    <div className="col-span-6 relative z-10">
                                        <div className="font-bold text-[#F4F4F5]">{resource.title}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider">{resource.type}</div>
                                    </div>
                                    <div className="col-span-3 relative z-10 text-right">
                                        <div className="font-mono text-lg font-bold text-[#FFB657]">{resource.accessCount}</div>
                                    </div>
                                    <div className="col-span-2 relative z-10 text-right">
                                        <div className={`font-mono font-bold ${resource.disputeCount > 0 ? 'text-[#FF5832]' : 'text-gray-600'}`}>
                                            {resource.disputeCount}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
