'use client';
import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, AlertTriangle, Play, Home, Database } from 'lucide-react';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { useAuth } from '@/components/AuthContext';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/dashboard/explore', label: 'All Data', icon: Database },
        { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/dashboard/resources', label: 'My Resources', icon: Package },
        { href: '/dashboard/demo', label: 'Demo', icon: Play },
        { href: '/dashboard/disputes', label: 'Disputes', icon: AlertTriangle }
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }

                .marquee-track {
                    display: inline-flex;
                    align-items: center;
                    gap: 3rem;
                    white-space: nowrap;
                    animation: marquee 18s linear infinite;
                }
            `}</style>

            {/* Announcement Bar */}
            <div className="bg-[#FF8E40] text-black border-b border-black/10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="relative w-full py-1.5 overflow-hidden">
                        <div className="marquee-track text-sm font-semibold">
                            <span>📣 Shadow Agent MCP is out.</span>
                            <span>🧩 Open claw skill coming soon.</span>
                            <span>✨ New MCP tools is live</span>
                            <Link href="/documentation" className="underline decoration-black/60 hover:decoration-black">
                                🔗 Check out docs for integration.
                            </Link>
                            <span>📣 Shadow Agent MCP is out.</span>
                            <span>🧩 Open claw skill coming soon.</span>
                            <span>✨ New MCP tools is live</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Navigation */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between py-4">
                        <nav className="flex items-center gap-6">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive
                                            ? 'text-[#FF8E40]'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                        <ConnectWalletButton />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {!isLoading && !isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
                        {/* Gradient background effect */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#FF8E40]/20 via-[#FF5832]/10 to-transparent rounded-full blur-3xl" />
                        </div>

                        <div className="relative z-10">
                            {/* 3D Head Icon / Image */}
                            <div className="mb-8 flex justify-center">
                                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#FF8E40] via-[#FF5832] to-[#B31D00] p-0.5">
                                    <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
                                        <div className="text-6xl">🔐</div>
                                    </div>
                                </div>
                            </div>

                            <h2 className="text-5xl font-bold text-white mb-4">Connect Wallet</h2>
                            <p className="text-gray-400 text-lg mb-12 max-w-md mx-auto">
                                Connect your web3 wallet to get started
                            </p>

                            {/* Wallet Connect Button */}
                            <div className="flex justify-center">
                                <ConnectWalletButton />
                            </div>
                        </div>
                    </div>
                ) : (
                    children
                )}
            </main>
        </div>
    );
}
