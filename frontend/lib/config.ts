// Backend API URL - will be set via environment variables in production
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ShadowWire API URL for ZK payment SDK
export const SHADOWWIRE_API_URL = process.env.NEXT_PUBLIC_SHADOWWIRE_API_URL || 'https://shadow.radr.fun/shadowpay/api';

// Legacy constant for backward compatibility
export const SHADOW_PAY_URL = 'https://shadow.radr.fun';
