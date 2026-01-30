// Backend API URL - configured via environment variables
// Production fallback ensures deployment works even if env var is misconfigured
const PRODUCTION_API_URL = 'https://shadow-backend-cwpb.onrender.com/api';

export function getApiUrl(): string {
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim();

    // Use environment variable if valid
    if (raw && raw.startsWith('http')) {
        return raw;
    }

    // In browser: use production URL in production, localhost in development
    if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
        return isLocalhost ? 'http://localhost:3001/api' : PRODUCTION_API_URL;
    }

    // During build/SSR: use production URL
    return PRODUCTION_API_URL;
}
// ShadowWire API URL for ZK payment SDK
export const SHADOWWIRE_API_URL = process.env.NEXT_PUBLIC_SHADOWWIRE_API_URL || 'https://shadow.radr.fun/shadowpay/api';

// Legacy constant for backward compatibility
export const SHADOW_PAY_URL = 'https://shadow.radr.fun';
