import axios, { AxiosInstance } from 'axios';

export interface X402PaymentRequirements {
    scheme: string;
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
    async verifyX402(paymentHeader: string, requirements: X402PaymentRequirements) {
        const response = await this.client.post('/shadowpay/verify', {
            x402Version: requirements.x402Version || 1,
            paymentHeader,
            paymentRequirements: requirements
        });
        return response.data; // { isValid: boolean, invalidReason?: string, paymentToken?: string }
    }

    /**
     * Execute the payment on-chain by withdrawing from escrow to merchant.
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

    // --- Payment Intents (Merchant Side) ---
    async createPaymentIntent(amount: number, currency: string = 'USDC', memo?: string) {
        const response = await this.client.post('/shadowpay/v1/pay/intent', {
            amount,
            currency,
            memo,
        });
        return response.data;
    }

    async verifyPaymentIntent(intentId: string) {
        const response = await this.client.post('/shadowpay/v1/pay/verify', {
            intent_id: intentId,
        });
        return response.data; // { paid: boolean, ... }
    }

    // --- Escrow / ZK Settlement (Facilitator Side) ---

    /**
     * Verify an incoming ZK proof from an Agent to fund the Escrow.
     * This corresponds to the Agent paying the Facilitator.
     */
    async settleIncomingPayment(proof: any, transactionPayload: any) {
        const response = await this.client.post('/shadowpay/v1/zk/settle', {
            proof,
            transaction_payload: transactionPayload,
        });
        return response.data;
    }

    /**
     * Send funds from Facilitator Wallet to Merchant (Settlement).
     */
    async payoutToMerchant(merchantAddress: string, amount: number) {
        const response = await this.client.post('/shadowpay/v1/escrow/withdraw', {
            to_address: merchantAddress,
            amount,
        });
        return response.data;
    }

    /**
     * Refund funds to Agent.
     */
    async refundToAgent(agentAddress: string, amount: number) {
        const response = await this.client.post('/shadowpay/v1/escrow/withdraw', {
            to_address: agentAddress,
            amount,
        });
        return response.data;
    }
}

