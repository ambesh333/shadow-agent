'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-full px-6 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="text-xl font-bold text-white">
                        SP
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/demo" className="text-sm text-gray-300 hover:text-white transition-colors">
                            Demo
                        </Link>
                    </div>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link href="/dashboard" className="px-8 py-3 bg-[#FF8E40] hover:bg-[#FF5832] text-white font-semibold rounded-full transition-colors text-sm">
                            Build with shadow
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden mt-4 pt-4 border-t border-white/10">
                        <div className="flex flex-col gap-3">
                            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/demo" className="text-sm text-gray-300 hover:text-white transition-colors">
                                Demo
                            </Link>
                            <div className="flex flex-col gap-2 mt-2">
                                <Link href="/dashboard" className="px-8 py-3 bg-[#FF8E40] hover:bg-[#FF5832] text-white font-semibold rounded-full transition-colors text-sm text-center">
                                    Build with shadow
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
