'use client';
import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/config';
import { Shield } from 'lucide-react';

// Skeleton shimmer component
const Shimmer = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded ${className}`}
        style={{ animation: 'shimmer 1.5s infinite' }} />
);

// Card skeleton
const CardSkeleton = () => (
    <div className="bg-black p-6 rounded-xl shadow-lg border border-white/10 bg-gradient-to-br from-black to-[#1a0f08]">
        <Shimmer className="h-3 w-24 mb-4" />
        <Shimmer className="h-10 w-32 mb-4" />
        <Shimmer className="h-1.5 w-full mt-4" />
        <Shimmer className="h-3 w-40 mt-2" />
    </div>
);

// Table row skeleton
const TableRowSkeleton = ({ index }: { index: number }) => {
    const opacity = Math.max(0.02, 0.2 - (index * 0.03));
    return (
        <div className="relative grid grid-cols-12 gap-4 items-center px-6 py-4 rounded-xl border border-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF8E40] to-transparent pointer-events-none" style={{ opacity: opacity }} />
            <div className="col-span-1 relative z-10">
                <Shimmer className="h-5 w-6" />
            </div>
            <div className="col-span-5 relative z-10 space-y-2">
                <Shimmer className="h-5 w-48" />
                <Shimmer className="h-3 w-16" />
            </div>
            <div className="col-span-2 relative z-10 flex justify-end">
                <Shimmer className="h-6 w-12" />
            </div>
            <div className="col-span-2 relative z-10 flex justify-end">
                <Shimmer className="h-6 w-12" />
            </div>
            <div className="col-span-2 relative z-10 flex justify-end">
                <Shimmer className="h-6 w-8" />
            </div>
        </div>
    );
};

// Get color based on score
const getScoreColor = (score: number): string => {
    if (score >= 85) return '#22c55e';  // green
    if (score >= 70) return '#84cc16';  // lime
    if (score >= 55) return '#eab308';  // yellow
    if (score >= 40) return '#f97316';  // orange
    return '#ef4444';                   // red
};

interface Stats {
    escrowBalance: number;
    activeDisputes: number;
    totalSales: number;
    merchantScore: number;
    merchantScoreLabel: string;
    merchantScoreColor: string;
    resourcesAnalytics: any[];
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({
        escrowBalance: 0,
        activeDisputes: 0,
        totalSales: 0,
        merchantScore: 50,
        merchantScoreLabel: 'Fair',
        merchantScoreColor: '#eab308',
        resourcesAnalytics: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const API_URL = getApiUrl();
                const response = await fetch(`${API_URL}/auth/stats`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(localStorage.getItem('auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } : {})
                    },
                    credentials: 'include', // Send cookies
                });

                if (response.ok) {
                    const data = await response.json();
                    setStats({
                        escrowBalance: data.escrowBalance || 0,
                        activeDisputes: data.activeDisputes || 0,
                        totalSales: data.totalSales || 0,
                        merchantScore: data.merchantScore || 50,
                        merchantScoreLabel: data.merchantScoreLabel || 'Fair',
                        merchantScoreColor: data.merchantScoreColor || '#eab308',
                        resourcesAnalytics: data.resourcesAnalytics || []
                    });
                } else {
                    console.error('Failed to fetch stats:', await response.text());
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div>
            {/* CSS for shimmer animation */}
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

            `}</style>

            {/* Header with Merchant Score */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white">Overview</h2>
                    <p className="text-gray-400">Welcome back, Merchant.</p>
                </div>

                {/* Merchant Score Badge */}
                {!isLoading && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-black/50">
                        <div className="flex items-center justify-center w-14 h-14 rounded-xl"
                            style={{ backgroundColor: `${stats.merchantScoreColor}20` }}>
                            <span className="text-2xl font-bold" style={{ color: stats.merchantScoreColor }}>
                                {stats.merchantScore}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <Shield size={14} style={{ color: stats.merchantScoreColor }} />
                                <span className="text-sm font-medium" style={{ color: stats.merchantScoreColor }}>
                                    {stats.merchantScoreLabel}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">Your Trust Score</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isLoading ? (
                    <>
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </div>

            {/* Merchant Resources Analytics Table */}
            <div className="mt-12">
                <h3 className="text-xl font-bold text-[#F4F4F5] mb-6">Top Performing Resources</h3>

                <div className="space-y-3">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                        <div className="col-span-1">Rank</div>
                        <div className="col-span-5">Resource</div>
                        <div className="col-span-2 text-right">Access Count</div>
                        <div className="col-span-2 text-right">Trust Score</div>
                        <div className="col-span-2 text-right">Lost Disputes</div>
                    </div>

                    {/* Data Rows */}
                    {isLoading ? (
                        <>
                            <TableRowSkeleton index={0} />
                            <TableRowSkeleton index={1} />
                            <TableRowSkeleton index={2} />
                            <TableRowSkeleton index={3} />
                        </>
                    ) : stats.resourcesAnalytics.length === 0 ? (
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
                                    <div className="col-span-5 relative z-10">
                                        <div className="font-bold text-[#F4F4F5]">{resource.title}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider">{resource.type}</div>
                                    </div>
                                    <div className="col-span-2 relative z-10 text-right">
                                        <div className="font-mono text-lg font-bold text-[#FFB657]">{resource.accessCount}</div>
                                    </div>
                                    <div className="col-span-2 relative z-10 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                                style={{
                                                    backgroundColor: `${getScoreColor(resource.trustScore)}20`,
                                                    color: getScoreColor(resource.trustScore)
                                                }}>
                                                {resource.trustScore}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 relative z-10 text-right">
                                        <div className={`font-mono font-bold ${resource.lostDisputes > 0 ? 'text-[#FF5832]' : 'text-gray-600'}`}>
                                            {resource.lostDisputes}
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
