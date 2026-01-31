'use client';

export default function BentoGrid() {
    return (
        <section className="py-24 bg-black">
            <div className="max-w-6xl mx-auto px-12 md:px-24">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-white">
                        The Gateway to <span className="bg-gradient-to-r from-[#FF8E40] to-[#FFB657] bg-clip-text text-transparent">Privacy-AI</span>
                    </h2>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Left: Portrait Image */}
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 group h-[500px] md:h-auto md:row-span-2">
                        <img
                            src="/bento/portrait.jpg"
                            alt="Solana's Flagship x402 Marketplace"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    {/* Right Top: Landscape Image 1 */}
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 group h-[240px] md:h-auto">
                        <img
                            src="/bento/landscape1.jpg"
                            alt="Privacy intact with Shadow Wire"
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    {/* Right Bottom: Landscape Image 2 */}
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 group h-[240px] md:h-auto">
                        <img
                            src="/bento/landscape2.jpg"
                            alt="Powered by Solana and RADR Labs"
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                </div>
            </div>
        </section>
    );
}
