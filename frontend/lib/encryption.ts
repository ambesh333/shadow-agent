/**
 * Client-side encryption utilities for privacy-preserving dispute messages
 * Uses facilitator's public key for encryption to preserve merchant privacy
 */
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Facilitator's encryption public key (shared with frontend)
// This is the public key - safe to expose
const ENCRYPTION_PUBLIC_KEY = '8j3qXnTZMyht872aKqt7WKFdbbvpYoJRRzstpRHEX1Xr';

/**
 * Ed25519 to X25519 public key conversion
 * Converts Solana wallet public key to encryption-compatible format
 */
function ed25519ToX25519Public(ed25519Pub: Uint8Array): Uint8Array {
    const p = BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed');

    // Convert bytes to BigInt (little-endian), clearing sign bit
    let y = BigInt(0);
    for (let i = 0; i < 32; i++) {
        y += BigInt(ed25519Pub[i] & (i === 31 ? 0x7f : 0xff)) << BigInt(8 * i);
    }

    // Calculate u = (1 + y) / (1 - y) mod p
    const one = BigInt(1);
    const numerator = mod(one + y, p);
    const denominator = mod(one - y, p);
    const u = mod(numerator * modInverse(denominator, p), p);

    // Convert back to bytes (little-endian)
    const result = new Uint8Array(32);
    let temp = u;
    for (let i = 0; i < 32; i++) {
        result[i] = Number(temp & BigInt(0xff));
        temp >>= BigInt(8);
    }

    return result;
}

function mod(n: bigint, p: bigint): bigint {
    return ((n % p) + p) % p;
}

function modInverse(a: bigint, p: bigint): bigint {
    let [old_r, r] = [a, p];
    let [old_s, s] = [BigInt(1), BigInt(0)];

    while (r !== BigInt(0)) {
        const quotient = old_r / r;
        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
    }

    return mod(old_s, p);
}

/**
 * Encrypt a dispute message using the facilitator's encryption key
 * This preserves merchant privacy - their wallet is never exposed
 * 
 * @param message - Plaintext dispute reason
 * @returns Hex-encoded ciphertext
 */
export function encryptDisputeMessage(message: string): string {
    // Decode facilitator's public key
    const ed25519PubKey = bs58.decode(ENCRYPTION_PUBLIC_KEY);

    // Convert to X25519 for encryption
    const x25519PubKey = ed25519ToX25519Public(ed25519PubKey);

    // Generate ephemeral keypair for one-time encryption
    const ephemeralKeyPair = nacl.box.keyPair();

    // Create random nonce
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Encrypt the message
    const messageBytes = new TextEncoder().encode(message);
    const encrypted = nacl.box(messageBytes, nonce, x25519PubKey, ephemeralKeyPair.secretKey);

    // Pack: ephemeral public key (32) + nonce (24) + ciphertext
    const sealed = new Uint8Array(32 + nacl.box.nonceLength + encrypted.length);
    sealed.set(ephemeralKeyPair.publicKey, 0);
    sealed.set(nonce, 32);
    sealed.set(encrypted, 32 + nacl.box.nonceLength);

    // Return as hex string for storage
    return Array.from(sealed).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Legacy encrypt function - kept for backwards compatibility
 * @deprecated Use encryptDisputeMessage instead
 */
export function encryptForWallet(message: string, _recipientPubKey?: string): string {
    // Ignore recipient and use facilitator's key for privacy
    return encryptDisputeMessage(message);
}
