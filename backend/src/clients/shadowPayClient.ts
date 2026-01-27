import axios, { AxiosInstance } from 'axios';

export interface X402PaymentRequirements {
    scheme: string | "zkproof";
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    extra?: any;
    x402Version?: number;
}

export class ShadowPayClient {
    private client: AxiosInstance;
    private apiKey: string;

    constructor(baseURL: string, apiKey: string) {
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
        });

        // Debug logging
        this.client.interceptors.request.use(request => {
            console.log('[ShadowPayClient] Request:', {
                method: request.method?.toUpperCase(),
                url: request.url,
                baseURL: request.baseURL,
                apiKeyConfigured: !!request.headers['X-API-Key'],
                apiKeyPreview: request.headers['X-API-Key'] ? `${(request.headers['X-API-Key'] as string).slice(0, 4)}...` : 'NONE'
            });
            return request;
        });

        this.client.interceptors.response.use(
            response => response,
            error => {
                console.error('[ShadowPayClient] Error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    url: error.config?.url
                });
                return Promise.reject(error);
            }
        );
    }

    // --- x402 Protocol Methods ---

    /**
     * Verify a zero-knowledge proof payment according to the x402 protocol.
     */
    async verifyX402(paymentHeader: string | "", requirements: X402PaymentRequirements) {
        // Extract x402Version if present, default to 1
        const { x402Version, ...restRequirements } = requirements;

        const response = await this.client.post('/shadowpay/verify', {
            x402Version: x402Version || 1,
            paymentHeader,
            paymentRequirements: restRequirements
        });
        return response.data; // { isValid: boolean, invalidReason?: string, paymentToken?: string }
    }

    /**
     * Execute the payment on-chain by withdrawing from escrow to merchant.
     * Use this to settle the initial payment from Agent to Facilitator.
     */
    async settleX402(paymentHeader: string, requirements: X402PaymentRequirements, metadata?: any) {
        const response = await this.client.post('/shadowpay/settle', {
            x402Version: requirements.x402Version || 1,
            paymentHeader,
            paymentRequirements: requirements,
            metadata: metadata || {}
        });
        return response.data; // { success: boolean, error?: string, txHash?: string }
    }

    // --- Escrow Management ---

    /**
     * Get SOL escrow balance for a wallet.
     */
    async getEscrowBalance(walletAddress: string) {
        const response = await this.client.get(`/shadowpay/api/escrow/balance/${walletAddress}`);
        return response.data; // { wallet_address: string, balance: number }
    }

    /**
     * Withdraw funds from escrow (Facilitator paying Merchant or Agent).
     * This uses the signed withdrawal flow if necessary, or the internal relayer if authorized.
     */
    async withdrawFromEscrow(walletAddress: string, amount: number) {
        const response = await this.client.post('/shadowpay/api/escrow/withdraw', {
            wallet_address: walletAddress,
            amount: amount,
        });
        return response.data; // { unsigned_tx_base64: string, ... }
    }

    /**
     * (Optional) Direct payout if using the merchant settlement endpoint specifically.
     */
    async payoutToMerchant(merchantAddress: string, amount: number) {
        // For simplicity, we use the same withdraw endpoint as facilitators are effectively 'users' in the escrow
        return this.withdrawFromEscrow(merchantAddress, amount);
    }

    /**
     * (Optional) Direct refund.
     */
    async refundToAgent(agentAddress: string, amount: number) {
        return this.withdrawFromEscrow(agentAddress, amount);
    }

    // --- Payment Transfer (using correct API from api.md) ---

    /**
     * Withdraw from payment account to a wallet.
     * API: POST /shadowpay/v1/payment/withdraw
     * 
     * This transfers funds from the Facilitator's payment account to a recipient wallet.
     * Used for settlement (to Merchant) or refund (to Agent).
     * 
     * @param recipientWallet - The recipient's wallet address (Merchant/Agent)
     * @param amountLamports - Amount in lamports (1 SOL = 1e9 lamports)
     */
    async withdrawToWallet(recipientWallet: string, amountLamports: number) {
        console.log(`[ShadowPayClient] Payment Withdraw: -> ${recipientWallet}, ${amountLamports} lamports`);
        console.log(this.client.defaults.headers);
        const response = await this.client.post('/shadowpay/v1/payment/withdraw', {
            wallet_address: recipientWallet,
            amount: amountLamports
        });

        return response.data;
    }

    /**
     * Helper method that converts SOL to lamports and calls withdrawToWallet.
     * This is the main method to use for settlement/refund transfers.
     */
    async transferToWallet(recipientWallet: string, amountSOL: number) {
        const amountLamports = Math.floor(amountSOL * 1e9);
        console.log(`[ShadowPayClient] Transfer: ${amountSOL} SOL (${amountLamports} lamports) -> ${recipientWallet}`);
        return this.withdrawToWallet(recipientWallet, amountLamports);
    }

    /**
     * Settle payment with ZK proof (x402 flow step 3).
     * API: POST /shadowpay/v1/payment/settle
     */
    async settlePaymentWithProof(commitment: string, proof: string, publicSignals: string[], encryptedAmount?: number[]) {
        console.log(`[ShadowPayClient] Settling payment with commitment: ${commitment.slice(0, 20)}...`);

        const response = await this.client.post('/shadowpay/v1/payment/settle', {
            commitment,
            proof,
            public_signals: publicSignals,
            encrypted_amount: encryptedAmount || null
        });

        return response.data;
    }
}

