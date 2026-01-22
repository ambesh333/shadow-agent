'use client';

import { useScroll, useTransform, motion, useMotionValueEvent } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

const frameCount = 240;
const frames = Array.from({ length: frameCount }, (_, i) => {
    const paddedIndex = (i + 1).toString().padStart(3, '0');
    return `/sequence/ezgif-frame-${paddedIndex}.jpg`;
});

export default function PaymentStackScroll() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);

    const scroll = useScroll(); // safe during SSR / first render
    const { scrollYProgress } = scroll;

    // useEffect(() => {
    //     if (!containerRef.current) return;

    //     scroll.set({
    //         target: containerRef,
    //         offset: ['start start', 'end end'],
    //     });
    // }, [scroll]);

    const currentIndex = useTransform(scrollYProgress, [0, 1], [0, frameCount - 1]);

    useEffect(() => {
        const loadImages = async () => {
            const loadedImages: HTMLImageElement[] = [];
            const promises = frames.map((src) => {
                return new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.src = src;
                    img.onload = () => {
                        loadedImages.push(img);
                        resolve();
                    };
                    img.onerror = () => {
                        console.error(`Failed to load image: ${src}`);
                        // Resolve anyway to avoid blocking everything on one missing frame
                        resolve();
                    };
                });
            });

            await Promise.all(promises);
            // Sort images based on src to ensure correct order if they load out of order
            loadedImages.sort((a, b) => {
                const aIndex = parseInt(a.src.match(/frame-(\d+)/)?.[1] || '0');
                const bIndex = parseInt(b.src.match(/frame-(\d+)/)?.[1] || '0');
                return aIndex - bIndex;
            });

            setImages(loadedImages);
            setImagesLoaded(true);
        };

        loadImages();
    }, []);

    useMotionValueEvent(currentIndex, 'change', (latest) => {
        const frameIndex = Math.round(latest);
        if (frameIndex !== currentFrame && imagesLoaded) {
            setCurrentFrame(frameIndex);
            renderFrame(frameIndex);
        }
    });

    const renderFrame = (index: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !images[index]) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw image - contain within canvas
        const img = images[index];

        // Calculate aspect ratio to "contain" the image
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio);

        const centerShift_x = (canvas.width - img.width * ratio) / 2;
        const centerShift_y = (canvas.height - img.height * ratio) / 2;

        ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            centerShift_x,
            centerShift_y,
            img.width * ratio,
            img.height * ratio
        );
    };

    // Initial render when loaded
    useEffect(() => {
        if (imagesLoaded) {
            renderFrame(0);
        }
    }, [imagesLoaded]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                if (imagesLoaded) {
                    renderFrame(currentFrame);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        return () => window.removeEventListener('resize', handleResize);
    }, [imagesLoaded, currentFrame]);


    // Opacity transforms for text sections
    const opacity1 = useTransform(scrollYProgress, [0, 0.1, 0.2], [1, 1, 0]);
    const y1 = useTransform(scrollYProgress, [0, 0.2], [0, -50]);

    const opacity2 = useTransform(scrollYProgress, [0.15, 0.3, 0.45], [0, 1, 0]);
    const y2 = useTransform(scrollYProgress, [0.15, 0.3], [50, 0]);

    const opacity3 = useTransform(scrollYProgress, [0.4, 0.6, 0.75], [0, 1, 0]);
    const x3 = useTransform(scrollYProgress, [0.4, 0.6], [-50, 0]); // Slide in from left

    const opacity4 = useTransform(scrollYProgress, [0.7, 0.9, 1], [0, 1, 1]);
    const scale4 = useTransform(scrollYProgress, [0.7, 0.9], [0.9, 1]);

    if (!imagesLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#050505] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-400 font-mono">Initializing Protocol...</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative h-[400vh] bg-[#050505]">
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain"
                />

                {/* Section 1: Intro */}
                <motion.div
                    style={{ opacity: opacity1, y: y1 }}
                    className="absolute inset-0 flex items-center justify-center text-center pointer-events-none z-10"
                >
                    <div className="max-w-4xl px-6">
                        <h1 className="text-5xl md:text-7xl font-bold text-white/90 mb-4 tracking-tight">
                            Payments for <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">AI Agents & Bots</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-white/60 font-light">
                            Private. Programmatic. Zero-knowledge.
                        </p>
                    </div>
                </motion.div>

                {/* Section 2: Verification */}
                <motion.div
                    style={{ opacity: opacity2, y: y2 }}
                    className="absolute inset-0 flex items-center justify-start pointer-events-none z-10 pl-8 md:pl-24"
                >
                    <div className="max-w-xl text-left bg-black/40 backdrop-blur-sm p-8 rounded-2xl border border-white/5">
                        <h2 className="text-3xl md:text-4xl font-bold text-white/90 mb-3">
                            x402 Protocol <br />
                            Verifies the Payment
                        </h2>
                        <p className="text-lg text-white/60">
                            Agents pay programmatically — no trust required. <br />
                            <span className="text-cyan-400 text-sm font-mono mt-2 block">HASH: 0x7f...3a2b // VERIFIED</span>
                        </p>
                    </div>
                </motion.div>

                {/* Section 3: Privacy */}
                <motion.div
                    style={{ opacity: opacity3, x: x3 }}
                    className="absolute inset-0 flex items-center justify-end pointer-events-none z-10 pr-8 md:pr-24"
                >
                    <div className="max-w-xl text-right bg-black/40 backdrop-blur-sm p-8 rounded-2xl border border-white/5">
                        <h2 className="text-3xl md:text-4xl font-bold text-white/90 mb-3">
                            RADR ShadowPay <br />
                            Preserves Privacy
                        </h2>
                        <p className="text-lg text-white/60">
                            Funds remain in escrow until the agent is satisfied.
                        </p>
                        <div className="flex justify-end gap-2 mt-4">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-green-400 text-xs font-mono uppercase">Escrow Active</span>
                        </div>
                    </div>
                </motion.div>

                {/* Section 4: Completion */}
                <motion.div
                    style={{ opacity: opacity4, scale: scale4 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10"
                >
                    <div className="text-center bg-black/60 backdrop-blur-md p-12 rounded-3xl border border-white/10 shadow-2xl shadow-blue-900/20">
                        <h2 className="text-5xl font-bold text-white mb-2">Verified. Released. Settled.</h2>
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto my-6"></div>

                        <div className="flex flex-col md:flex-row gap-4 justify-center mt-8">
                            <button className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors text-lg">
                                Build with x402
                            </button>
                            <button className="px-8 py-4 bg-transparent border border-white/20 text-white font-semibold rounded-full hover:bg-white/5 transition-colors text-lg">
                                Read Docs
                            </button>
                        </div>

                        <div className="mt-12 grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
                            <a href="/dashboard" className="group p-4 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="text-sm text-gray-400 group-hover:text-blue-400 mb-1">Merchant</div>
                                <div className="font-medium text-white">Dashboard &rarr;</div>
                            </a>
                            <a href="/demo" className="group p-4 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="text-sm text-gray-400 group-hover:text-green-400 mb-1">Interactive</div>
                                <div className="font-medium text-white">Live Demo &rarr;</div>
                            </a>
                        </div>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
