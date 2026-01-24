'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from './AuthContext';
import { Loader2, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

export function ConnectWalletButton() {
    const { connected } = useWallet();
    const { user, isLoading, isAuthenticated, signIn, signOut, error } = useAuth();

    // Not connected to wallet yet
    if (!connected) {
        return <WalletMultiButton className="!bg-[#FF8E40] hover:!bg-[#FF5832] !rounded-full !font-semibold !px-8 !py-3 !text-sm !transition-colors" />;
    }

    // Connected but not authenticated
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-end gap-2">
                <button
                    onClick={signIn}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-8 py-3 bg-[#FF8E40] hover:bg-[#FF5832] rounded-full font-semibold text-sm transition-colors disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Signing...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={16} /> Sign In with Wallet
                        </>
                    )}
                </button>
                {error && (
                    <div className="flex items-center gap-1 text-[#FF5832] text-xs">
                        <AlertCircle size={12} /> {error}
                    </div>
                )}
            </div>
        );
    }

    // Authenticated
    return (
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-sm font-bold text-white truncate max-w-[200px]">
                    {user?.displayName || user?.walletAddress.slice(0, 8) + '...'}
                </p>
                <p className="text-xs text-gray-400">Connected</p>
            </div>
            <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-sm transition-colors"
            >
                <LogOut size={16} /> Sign Out
            </button>
        </div>
    );
}
