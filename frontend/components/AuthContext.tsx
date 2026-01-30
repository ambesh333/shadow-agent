'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getApiUrl } from '@/lib/config';
import bs58 from 'bs58';

interface User {
    id: string;
    walletAddress: string;
    displayName: string | null;
    isNewUser?: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { publicKey, signMessage, connected, disconnect } = useWallet();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/auth/me`, {
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch (e) {
            // Not authenticated, that's fine
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = useCallback(async () => {
        if (!publicKey || !signMessage) {
            setError('Please connect your wallet first');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const API_URL = getApiUrl();
            // Step 1: Get nonce
            const nonceRes = await fetch(`${API_URL}/auth/nonce`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicKey: publicKey.toBase58() }),
                credentials: 'include'
            });

            if (!nonceRes.ok) {
                throw new Error('Failed to get nonce');
            }

            const { nonce, challengeId } = await nonceRes.json();

            // Step 2: Construct and sign message
            const domain = 'localhost:3000';
            const issuedAt = new Date().toISOString();
            const message = `${domain} wants you to sign in with your Solana account:
                            ${publicKey.toBase58()}

                            Sign in to ${domain}

                            URI: http://${domain}
                            Version: 1
                            Chain ID: solana:mainnet
                            Nonce: ${nonce}
                            Issued At: ${issuedAt}`;

            const messageBytes = new TextEncoder().encode(message);
            const signature = await signMessage(messageBytes);
            const signatureBase58 = bs58.encode(signature);

            // Step 3: Verify with backend
            const verifyRes = await fetch(`${API_URL}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    publicKey: publicKey.toBase58(),
                    signature: signatureBase58,
                    message,
                    challengeId
                }),
                credentials: 'include'
            });

            if (!verifyRes.ok) {
                const data = await verifyRes.json();
                throw new Error(data.error || 'Verification failed');
            }

            const { user: userData } = await verifyRes.json();
            setUser(userData);

        } catch (e: any) {
            setError(e.message || 'Sign in failed');
            console.error('Sign in error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, signMessage]);

    const signOut = useCallback(async () => {
        try {
            const API_URL = getApiUrl();
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            setUser(null);
            disconnect();
        } catch (e) {
            console.error('Logout error:', e);
        }
    }, [disconnect]);

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            signIn,
            signOut,
            error
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
