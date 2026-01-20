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
}

