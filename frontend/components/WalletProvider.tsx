'use client';
import { FC, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Default Solana RPC URL - use environment variable in production
const DEFAULT_RPC_URL = 'https://api.mainnet-beta.solana.com';

interface WalletContextProviderProps {
    children: ReactNode;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
    // Track if we're on the client side
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // During SSR/prerender, render children without wallet context
    // This prevents Connection from being created during build
    if (!mounted) {
        return <>{children}</>;
    }

    // Only initialize wallet stuff on client side
    return <WalletProviderInner>{children}</WalletProviderInner>;
};

// Inner component that only runs on client
const WalletProviderInner: FC<{ children: ReactNode }> = ({ children }) => {
    // Get RPC URL from environment or use default
    const endpoint = useMemo(() => {
        const envUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim();
        if (envUrl && envUrl.startsWith('http')) {
            return envUrl;
        }
        return DEFAULT_RPC_URL;
    }, []);

    // Configure supported wallets
    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
    ], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
