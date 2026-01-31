'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-black">
            {/* Banner Image */}
            <div className="w-full">
                <img
                    src="/bento/footer-banner.jpg"
                    alt="Bring AI to Shadow Wire for 1M+ users"
                    className="w-full h-auto object-cover"
                />
            </div>

            {/* Footer Content */}
            <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <span className="text-2xl font-bold bg-gradient-to-r from-[#FF8E40] to-[#FFB657] bg-clip-text text-transparent">
                                SA
                            </span>
                        </Link>
                        <p className="text-gray-500 text-sm">
                            The privacy-first payment gateway for AI agents on Solana.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="text-white font-medium mb-4">Product</h4>
                        <ul className="space-y-3">
                            <li><Link href="/dashboard" className="text-gray-500 hover:text-white text-sm transition-colors">Dashboard</Link></li>
                            <li><Link href="/dashboard/demo" className="text-gray-500 hover:text-white text-sm transition-colors">Demo</Link></li>
                            <li><Link href="/dashboard/resources" className="text-gray-500 hover:text-white text-sm transition-colors">Resources</Link></li>
                        </ul>
                    </div>

                    {/* Developers */}
                    <div>
                        <h4 className="text-white font-medium mb-4">Developers</h4>
                        <ul className="space-y-3">
                            <li><a href="https://github.com/ambesh333/shadow-agent" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white text-sm transition-colors">GitHub</a></li>
                            <li><a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Documentation</a></li>
                            <li><a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">API Reference</a></li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div>
                        <h4 className="text-white font-medium mb-4">Connect</h4>
                        <ul className="space-y-3">
                            <li><a href="https://x.com/0xAmbesh" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white text-sm transition-colors">Twitter</a></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-600 text-sm">
                        © 2026 Shadow Agent. Powered by RADR Labs.
                    </p>
                </div>
            </div>
        </footer>
    );
}
