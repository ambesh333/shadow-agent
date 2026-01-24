'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const texts = [
    'AI-powered payments',
    'zero-knowledge proofs',
    'secure escrow',
    'private transactions'
];

export default function Hero() {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-orange-900/40" />

            {/* ASCII Hands Background */}
            <div className="absolute inset-0 opacity-30">
                <Image
                    src="/ascii-hands.png"
                    alt="Background"
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            {/* Vertical Light Glow */}
            <div className="absolute right-1/3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-orange-400 to-transparent opacity-60" />

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    {/* Left Side - Text Content */}
                    <div className="space-y-8">
                        <motion.h1
                            className="text-5xl md:text-7xl font-light text-white leading-tight"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <motion.span
                                key={currentTextIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="block"
                            >
                                {texts[currentTextIndex]},
                            </motion.span>
                            <span className="block mt-2">
                                redefined for the next generation.
                            </span>
                        </motion.h1>

                        <motion.button
                            className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-full transition-all text-sm font-medium"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            GET STARTED
                        </motion.button>

                        <motion.p
                            className="text-sm text-gray-400 max-w-md"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                        >
                            Our payment protocol redefines your workflow — intuitive, atmospheric, and built for control. No clutter. No friction. Just you and your secure flow, flowing at your pace.
                        </motion.p>
                    </div>

                </div>
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
        </section>
    );
}
