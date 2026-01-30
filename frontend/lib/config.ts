// Backend API URL - will be set via environment variables in production
export function getApiUrl(): string {
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim();

    // Validate URL format
    if (raw && raw.startsWith('http')) {
        return raw;
    }

    // In development (browser), fall back to localhost
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        return 'http://localhost:3001/api';
    }

    // In production or during build, require the env var
    throw new Error(
        'NEXT_PUBLIC_API_URL is missing or invalid. Set it in your environment variables (e.g., https://your-backend.com/api)'
    );
}
// ShadowWire API URL for ZK payment SDK
export const SHADOWWIRE_API_URL = process.env.NEXT_PUBLIC_SHADOWWIRE_API_URL || 'https://shadow.radr.fun/shadowpay/api';

// Legacy constant for backward compatibility
export const SHADOW_PAY_URL = 'https://shadow.radr.fun';
