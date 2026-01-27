'use client';

import { Suspense } from 'react';
import TerminalDemo from '@/components/TerminalDemo';

export default function DemoPage() {
    return (
        <div className="min-h-screen bg-black">
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
