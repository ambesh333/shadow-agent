'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Play } from 'lucide-react';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import TerminalDemo from '@/components/TerminalDemo';

export default function DemoPage() {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/dashboard/resources', label: 'Resources', icon: Package },
        { href: '/demo', label: 'Demo', icon: Play },
    ];

    return (
        <div className="min-h-screen bg-black">
            {/* Navigation Bar */}
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

            {/* Terminal Content */}
            <Suspense fallback={
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <div className="text-[#FF8E40]">Loading...</div>
                </div>
            }>
                <TerminalDemo />
            </Suspense>
        </div>
    );
}
