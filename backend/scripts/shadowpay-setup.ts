import dotenv from 'dotenv';
import { ShadowPay, generateMerchantKey } from '@shadowpay/server';
import axios from 'axios';
dotenv.config();

const BASE_URL = 'https://shadow.radr.fun/shadowpay';
const AGENT_WALLET = process.env.AGENT_WALLET || 'YOUR_WALLET_ADDRESS';
const API_KEY = process.env.SHADOWPAY_API_KEY;

const sp = new ShadowPay({
    apiKey: API_KEY || 'dummy'
});

async function setup() {
    console.log('--- ShadowPay Setup Tool ---');

    // 1. Generate/Verify API Key
    if (!API_KEY) {
        console.log('Generating API Key for wallet:', AGENT_WALLET);
        const keyData = await generateMerchantKey(AGENT_WALLET);
        console.log('API Key:', keyData.api_key);
        console.log('Merchant ID:', keyData.merchant_id);
        console.log('PLEASE STORE THIS IN .env AS SHADOWPAY_API_KEY');
    }

    // 2. Check Escrow Balance
    console.log(`Checking escrow balance for ${AGENT_WALLET}...`);
    try {
        const response = await axios.get(`${BASE_URL}/api/escrow/balance/${AGENT_WALLET}`, {
            headers: { 'X-API-Key': API_KEY || '' }
        });
        console.log('Escrow SOL balance (lamports):', response.data.balance);
    } catch (error: any) {
        console.warn('Escrow check failed (likely not registered or funded yet)');
    }
}

setup().catch(console.error);
