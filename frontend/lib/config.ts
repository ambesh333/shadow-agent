// Backend API URL - will be set via environment variables in production
export function getApiUrl(): string {
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim();

    // ✅ Browser runtime (client components)
    if (typeof window !== 'undefined') {
        return raw && raw.startsWith('http')
            ? raw
            : 'http://localhost:3001/api';
    }

    // ✅ Build / server runtime (SSR, prerender)
    if (!raw || !raw.startsWith('http')) {
        throw new Error(
            'NEXT_PUBLIC_API_URL is missing or invalid. It must start with http or https.'
        );
    }

    return raw;
}
// ShadowWire API URL for ZK payment SDK
export const SHADOWWIRE_API_URL = process.env.NEXT_PUBLIC_SHADOWWIRE_API_URL || 'https://shadow.radr.fun/shadowpay/api';

// Legacy constant for backward compatibility
export const SHADOW_PAY_URL = 'https://shadow.radr.fun';
