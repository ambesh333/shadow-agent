'use client';

interface FeatureItem {
    title: string;
    subtitle: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
}

const features: FeatureItem[] = [
    {
        title: 'Merchant Dashboard',
        subtitle: 'Complete Control',
        description: 'Monitor your escrow balance, track settled sales, and manage active disputes all from one powerful dashboard. Real-time analytics show your top-performing resources and transaction history.',
        imageSrc: '/screenshots/dashboard.png',
        imageAlt: 'Shadow Agent Dashboard'
    },
    {
        title: 'Agent Simulation',
        subtitle: 'Test Your Resources',
        description: 'Experience the payment flow from an AI agent\'s perspective. Our terminal-based demo lets you test x402 payment integration, deposit SOL to escrow, and access protected resources—all with zero-knowledge proofs.',
        imageSrc: '/screenshots/simulation.png',
        imageAlt: 'Agent Simulation Terminal'
    },
    {
        title: 'AI Dispute Analyzer',
        subtitle: 'Smart Resolution',
        description: 'When disputes arise, our AI analyzes delivery proof, merchant responses, and context to provide fair decisions. See confidence scores, reasoning, and resolve cases with a single click.',
        imageSrc: '/screenshots/disputes.png',
        imageAlt: 'AI Dispute Resolution'
    }
];

export default function FeatureShowcase() {
    return (
        <section className="py-24 bg-black">
            <div className="max-w-6xl mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Built for the <span className="bg-gradient-to-r from-[#FF8E40] to-[#FFB657] bg-clip-text text-transparent">AI Economy</span>
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Everything you need to accept private payments from AI agents and manage your digital resources.
                    </p>
                </div>

                {/* Feature Rows */}
                <div className="space-y-32">
                    {features.map((feature, index) => {
                        const isReversed = index % 2 === 1;

                        return (
                            <div
                                key={feature.title}
                                className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-16`}
                            >
                                {/* Image */}
                                <div className="flex-1 w-full">
                                    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#FF8E40]/10">
                                        {/* Placeholder for screenshot - replace with actual images */}
                                        <div className="aspect-video bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center">
                                            <div className="text-center p-8">
                                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#FF8E40]/20 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-[#FF8E40]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-500 text-sm">{feature.imageAlt}</p>
                                                <p className="text-gray-600 text-xs mt-1">Screenshot placeholder</p>
                                            </div>
                                        </div>

                                        {/* Glow effect */}
                                        <div className={`absolute -inset-1 bg-gradient-to-r from-[#FF8E40]/20 to-transparent blur-xl -z-10 ${isReversed ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 w-full">
                                    <div className={`${isReversed ? 'md:text-right' : ''}`}>
                                        <span className="text-[#FF8E40] text-sm font-medium uppercase tracking-wider">
                                            {feature.subtitle}
                                        </span>
                                        <h3 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
                                            {feature.title}
                                        </h3>
                                        <p className="text-gray-400 text-lg leading-relaxed">
                                            {feature.description}
                                        </p>

                                        {/* Feature highlights */}
                                        <div className={`flex flex-wrap gap-3 mt-6 ${isReversed ? 'md:justify-end' : ''}`}>
                                            {['Privacy-first', 'Real-time', 'ZK-powered'].map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1 text-xs font-medium text-[#FFB657] bg-[#FF8E40]/10 rounded-full border border-[#FF8E40]/20"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
