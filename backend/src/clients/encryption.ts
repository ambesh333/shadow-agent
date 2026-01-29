/**
 * Backend encryption/decryption utilities for dispute messages
 * Uses facilitator's keypair for centralized encryption
 */
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Load encryption keys from environment
const ENCRYPTION_PUBLIC_KEY = process.env.ENCRYPTION_WALLET_KEY || '';
const ENCRYPTION_SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY || '';

/**
 * Ed25519 to X25519 private key conversion
 * Derives X25519 key from Ed25519 secret key
 */
function ed25519SecretKeyToX25519(ed25519SecretKey: Uint8Array): Uint8Array {
    // The X25519 secret key is derived by hashing the seed (first 32 bytes of ed25519 secret)
    const seed = ed25519SecretKey.slice(0, 32);
    const hash = nacl.hash(seed);

    // Clamp for X25519
    const x25519Key = hash.slice(0, 32);
    x25519Key[0] &= 248;
    x25519Key[31] &= 127;
    x25519Key[31] |= 64;

    return x25519Key;
}

/**
 * Decrypt a dispute message using the facilitator's secret key
 * 
 * @param ciphertext - Hex-encoded ciphertext from frontend
 * @returns Decrypted plaintext or null if decryption fails
 */
export function decryptDisputeMessage(ciphertext: string): string | null {
    if (!ENCRYPTION_SECRET_KEY) {
        console.error('ENCRYPTION_SECRET_KEY not configured');
        return null;
    }

    try {
        // Parse hex string to bytes
        const sealed = new Uint8Array(
            ciphertext.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
        );

        // Unpack: ephemeral public key (32) + nonce (24) + encrypted data
        const ephemeralPubKey = sealed.slice(0, 32);
        const nonce = sealed.slice(32, 32 + nacl.box.nonceLength);
        const encrypted = sealed.slice(32 + nacl.box.nonceLength);

        // Decode facilitator's secret key and convert to X25519
        const ed25519SecretKey = bs58.decode(ENCRYPTION_SECRET_KEY);
        const x25519PrivateKey = ed25519SecretKeyToX25519(ed25519SecretKey);

        // Decrypt
        const decrypted = nacl.box.open(
            encrypted,
            nonce,
            ephemeralPubKey,
            x25519PrivateKey
        );

        if (!decrypted) {
            console.error('Decryption failed - invalid ciphertext or key mismatch');
            return null;
        }

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

/**
 * Verify a wallet signature to prove ownership
 * 
 * @param walletAddress - Base58 wallet address
 * @param message - The message that was signed
 * @param signature - Base58 encoded signature
 * @returns true if signature is valid for the wallet
 */
export function verifyWalletSignature(
    walletAddress: string,
    message: string,
    signature: string
): boolean {
    try {
        const publicKey = bs58.decode(walletAddress);
        const signatureBytes = bs58.decode(signature);
        const messageBytes = new TextEncoder().encode(message);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey);
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}
