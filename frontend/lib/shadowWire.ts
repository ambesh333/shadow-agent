import { ShadowWireClient, initWASM } from '@radr/shadowwire';
import { Connection, PublicKey } from '@solana/web3.js';

// Initialize the SDK client
// We use the public mainnet endpoint by default or custom if needed
export const shadowWire = new ShadowWireClient({
    // apiBaseUrl: 'https://shadow.radr.fun/shadowpay/api', // Default in SDK usually covers this
    debug: process.env.NODE_ENV === 'development',
});

// Initialize WASM with the correct public path
// This is required because the SDK's default resolution fails in some Next.js setups
if (typeof window !== 'undefined') {
    initWASM('/wasm/settler_wasm_bg.wasm').catch(e => {
        console.error('Failed to initialize ShadowWire WASM:', e);
    });
}

/**
 * Interface for deposit result
 */
export interface DepositResult {
    success: boolean;
    signature: string;
    amount: number;
}

/**
 * Helper to perform a deposit into the ShadowWire pool
 * @param connection Solana connection
 * @param wallet Wallet adapter object (must have publicKey and signTransaction)
 * @param amount Amount in SOL
 * @param network 'mainnet' or 'devnet'
 */
export const depositToPool = async (
    connection: Connection,
    wallet: any, // Wallet adapter
    amount: number,
    network: 'mainnet' | 'devnet' = 'mainnet'
): Promise<DepositResult> => {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected or does not support signing');
    }

    // 1. Get deposit transaction from SDK
    // The SDK handles the API call to /pool/deposit
    const response = await shadowWire.deposit({
        wallet: wallet.publicKey.toBase58(),
        amount: Math.floor(amount * 1_000_000_000)
    });

    if (!response || !response.unsigned_tx_base64) {
        throw new Error('Failed to generate deposit transaction');
    }

    // 2. Deserialize and Sign
    const { Transaction } = await import('@solana/web3.js');
    const txBuffer = Buffer.from(response.unsigned_tx_base64, 'base64');
    const transaction = Transaction.from(txBuffer);

    // 3. Sign
    const signedTx = await wallet.signTransaction(transaction);

    // 4. Send
    const signature = await connection.sendRawTransaction(signedTx.serialize());

    // Robust confirmation: handle timeouts by checking status manually if confirm fails
    try {
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        }, 'confirmed');
    } catch (e) {
        // If confirmation times out, check if it actually succeeded on-chain
        const status = await connection.getSignatureStatus(signature);
        if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
            console.log('Transaction confirmed despite timeout error');
            if (status.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
            }
        } else {
            throw e;
        }
    }

    return {
        success: true,
        signature,
        amount
    };
};

/**
 * Helper to perform an internal transfer (payment)
 * @param wallet Wallet adapter (needs signMessage)
 * @param recipient Recipient address (merchant wallet usually)
 * @param amount Amount in SOL
 */
export const payWithShadowWire = async (
    wallet: any,
    recipient: string,
    amount: number
) => {
    if (!wallet.publicKey || !wallet.signMessage) {
        throw new Error('Wallet does not support message signing');
    }

    // Ensure WASM is initialized with the correct path before transfer
    if (typeof window !== 'undefined') {
        try {
            await initWASM('/wasm/settler_wasm_bg.wasm');
        } catch (e) {
            console.error('WASM init failed, retrying with default...', e);
        }
    }

    // Transfer using SDK
    return await shadowWire.transfer({
        sender: wallet.publicKey.toBase58(),
        recipient: recipient,
        amount: amount, // Human readable SOL
        token: 'SOL',
        type: 'internal',
        wallet: {
            signMessage: wallet.signMessage
        }
    });
};

/**
 * Helper to get pool balance
 * @param wallet Wallet adapter (needs publicKey)
 * @param token Token symbol (default 'SOL')
 */
export const getPoolBalance = async (
    wallet: any,
    token: 'SOL' = 'SOL'
) => {
    if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
    }

    return await shadowWire.getBalance(wallet.publicKey.toBase58(), token);
};
