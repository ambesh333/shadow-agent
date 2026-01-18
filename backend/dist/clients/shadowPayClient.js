"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowPayClient = void 0;
const axios_1 = __importDefault(require("axios"));
class ShadowPayClient {
    constructor(baseURL, apiKey) {
        this.apiKey = apiKey;
        this.client = axios_1.default.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
        });
    }
    // --- Payment Intents (Merchant Side) ---
    createPaymentIntent(amount_1) {
        return __awaiter(this, arguments, void 0, function* (amount, currency = 'USDC', memo) {
            const response = yield this.client.post('/shadowpay/v1/pay/intent', {
                amount,
                currency,
                memo,
            });
            return response.data;
        });
    }
    verifyPaymentIntent(intentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.client.post('/shadowpay/v1/pay/verify', {
                intent_id: intentId,
            });
            return response.data; // { paid: boolean, ... }
        });
    }
    // --- Escrow / ZK Settlement (Facilitator Side) ---
    /**
     * Verify an incoming ZK proof from an Agent to fund the Escrow.
     * This corresponds to the Agent paying the Facilitator.
     */
    settleIncomingPayment(proof, transactionPayload) {
        return __awaiter(this, void 0, void 0, function* () {
            // In a real ZK system, we submit the proof to the relayer
            const response = yield this.client.post('/shadowpay/v1/zk/settle', {
                proof,
                transaction_payload: transactionPayload,
            });
            return response.data; // { tx_signature: string, status: "confirmed" }
        });
    }
    /**
     * Send funds from Facilitator Wallet to Merchant (Settlement).
     * Requires Facilitator's own keys/proof generation (mocked here as API call).
     */
    payoutToMerchant(merchantAddress, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.client.post('/shadowpay/v1/escrow/withdraw', {
                to_address: merchantAddress,
                amount,
            });
            return response.data;
        });
    }
    /**
     * Refund funds to Agent.
     */
    refundToAgent(agentAddress, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.client.post('/shadowpay/v1/escrow/withdraw', {
                to_address: agentAddress,
                amount,
            });
            return response.data;
        });
    }
}
exports.ShadowPayClient = ShadowPayClient;
