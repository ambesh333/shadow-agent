'use client';

import { useScroll, useTransform, motion, useMotionValueEvent } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

const frameCount = 240;
const frames = Array.from({ length: frameCount }, (_, i) => {
    const paddedIndex = (i + 1).toString().padStart(3, '0');
    return `/sequence/ezgif-frame-${paddedIndex}.jpg`;
});

const layerInfo = [
    {
        title: "Payment Initialization",
        description: "Agent initiates a private payment request through the x402 protocol",
        color: "#FFB657"
    },
    {
        title: "x402 Protocol Verification",
        description: "Zero-knowledge proofs verify the payment without exposing transaction details",
        color: "#FF8E40"
    },
    {
        title: "RADR ShadowPay Privacy Layer",
        description: "Funds locked in secure escrow while maintaining complete privacy",
        color: "#FF5832"
    },
    {
        title: "Settlement Complete",
        description: "Transaction verified, privacy preserved, settlement finalized",
        color: "#B31D00"
    }
];

export default function PaymentStackScroll() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);

    const scroll = useScroll();
    const { scrollYProgress } = scroll;

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
                        resolve();
                    };
                });
            });

            await Promise.all(promises);
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

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const img = images[index];
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

    useEffect(() => {
        if (imagesLoaded) {
            renderFrame(0);
        }
    }, [imagesLoaded]);

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                // Canvas - 55% of viewport width (10% bigger)
                canvasRef.current.width = window.innerWidth * 0.70;
                canvasRef.current.height = window.innerHeight;
                if (imagesLoaded) {
                    renderFrame(currentFrame);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [imagesLoaded, currentFrame]);

    // Card animations - each card appears at different scroll stages with no overlap
    const card1Opacity = useTransform(scrollYProgress, [0, 0.1, 0.2, 0.25], [0, 1, 1, 0]);
    const card2Opacity = useTransform(scrollYProgress, [0.25, 0.35, 0.45, 0.5], [0, 1, 1, 0]);
    const card3Opacity = useTransform(scrollYProgress, [0.5, 0.6, 0.7, 0.75], [0, 1, 1, 0]);
    const card4Opacity = useTransform(scrollYProgress, [0.75, 0.85, 0.95, 1], [0, 1, 1, 1]);

    const cardOpacities = [card1Opacity, card2Opacity, card3Opacity, card4Opacity];

    if (!imagesLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-t-2 border-[#FFB657] rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-400 font-mono">Initializing Protocol...</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative h-[400vh] bg-black">
            <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">

                {/* Centered Canvas with Glassmorphism Border */}
                <div className="relative flex items-center justify-center">
                    <div className="rounded-3xl">
                        <canvas
                            ref={canvasRef}
                            className="max-w-full max-h-full object-contain rounded-2xl"
                        />
                    </div>
                </div>

                {/* Card 1 - Left */}
                <motion.div
                    style={{ opacity: card1Opacity }}
                    className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 max-w-md z-20"
                >
                    <div className="backdrop-blur-md bg-gradient-to-br from-[#2a1f18]/80 to-[#1a1310]/60 border border-[#3a2818]/40 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                                style={{ backgroundColor: layerInfo[0].color }}
                            >
                                1
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-[#F4F4F5] mb-2">
                                    {layerInfo[0].title}
                                </h3>
                                <p className="text-sm text-gray-300/80 leading-relaxed">
                                    {layerInfo[0].description}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Card 2 - Right */}
                <motion.div
                    style={{ opacity: card2Opacity }}
                    className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 max-w-md z-20"
                >
                    <div className="backdrop-blur-md bg-gradient-to-br from-[#2a1f18]/80 to-[#1a1310]/60 border border-[#3a2818]/40 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                                style={{ backgroundColor: layerInfo[1].color }}
                            >
                                2
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-[#F4F4F5] mb-2">
                                    {layerInfo[1].title}
                                </h3>
                                <p className="text-sm text-gray-300/80 leading-relaxed">
                                    {layerInfo[1].description}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Card 3 - Left */}
                <motion.div
                    style={{ opacity: card3Opacity }}
                    className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 max-w-md z-20"
                >
                    <div className="backdrop-blur-md bg-gradient-to-br from-[#2a1f18]/80 to-[#1a1310]/60 border border-[#3a2818]/40 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                                style={{ backgroundColor: layerInfo[2].color }}
                            >
                                3
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-[#F4F4F5] mb-2">
                                    {layerInfo[2].title}
                                </h3>
                                <p className="text-sm text-gray-300/80 leading-relaxed">
                                    {layerInfo[2].description}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Card 4 - Right */}
                <motion.div
                    style={{ opacity: card4Opacity }}
                    className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 max-w-md z-20"
                >
                    <div className="backdrop-blur-md bg-gradient-to-br from-[#2a1f18]/80 to-[#1a1310]/60 border border-[#3a2818]/40 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                                style={{ backgroundColor: layerInfo[3].color }}
                            >
                                4
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-[#F4F4F5] mb-2">
                                    {layerInfo[3].title}
                                </h3>
                                <p className="text-sm text-gray-300/80 leading-relaxed">
                                    {layerInfo[3].description}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}