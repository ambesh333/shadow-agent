'use client';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import PaymentStackScroll from '@/components/PaymentStackScroll';

export default function Home() {
    return (
        <>
            <Navbar />
            <Hero />
            <PaymentStackScroll />
        </>
    );
}
