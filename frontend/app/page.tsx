'use client';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import PaymentStackScroll from '@/components/PaymentStackScroll';
import BentoGrid from '@/components/BentoGrid';
import FeatureShowcase from '@/components/FeatureShowcase';
import Footer from '@/components/Footer';

export default function Home() {
    return (
        <>
            <Navbar />
            <Hero />
            <PaymentStackScroll />
            <BentoGrid />
            <FeatureShowcase />
            <Footer />
        </>
    );
}
