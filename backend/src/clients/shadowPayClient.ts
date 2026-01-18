import axios, { AxiosInstance } from 'axios';

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
        // In a real ZK system, we submit the proof to the relayer
        const response = await this.client.post('/shadowpay/v1/zk/settle', {
            proof,
            transaction_payload: transactionPayload,
        });
        return response.data; // { tx_signature: string, status: "confirmed" }
    }

    /**
     * Send funds from Facilitator Wallet to Merchant (Settlement).
     * Requires Facilitator's own keys/proof generation (mocked here as API call).
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
