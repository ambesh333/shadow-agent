import axios from 'axios';
import { ShadowPay, WalletInterface } from '@shadowpay/client';
import { Keypair, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config();

const GATEWAY_URL = 'http://localhost:3001/api/gateway/resource/6c357081-9414-4e15-8b37-221f99cef9c8';

// Create a mock wallet for Node.js
const keypair = Keypair.generate();
const nodeWallet: WalletInterface = {
    publicKey: keypair.publicKey,
    connected: true,
    signTransaction: async (tx) => {
        tx.partialSign(keypair);
        return tx;
    },
    signAllTransactions: async (txs) => {
        txs.forEach(tx => tx.partialSign(keypair));
        return txs;
    }
};

async function run() {
    try {
        console.log('--- Agent Payment & Fetch Execution ---');

        // Step 1: get 402 requirements
        console.log('1. Fetching requirements from gateway...');
        let requirements: any;
        try {
            const res = await axios.get(GATEWAY_URL);
            if (res.status === 200) {
                console.log('Resource already accessible:', res.data);
                return;
            }
        } catch (error: any) {
            if (error.response?.status === 402) {
                requirements = error.response.data.paymentRequirements;
                console.log(`402 Payment Required: ${requirements.maxAmountRequired} SOL`);
            } else {
                throw error;
            }
        }

        // Step 2: create payment using SDK
        console.log('2. Generating payment via ShadowPay SDK...');
        const client = new ShadowPay({
            merchantKey: requirements.payTo,
            merchantWallet: requirements.payTo,
        });

        const paymentResult = await client.pay({
            amount: Number(requirements.maxAmountRequired),
            token: 'SOL',
            wallet: nodeWallet
        });

        console.log('Payment generated. Status:', paymentResult.status);

        const paymentHeader = Buffer.from(JSON.stringify(paymentResult)).toString('base64');

        // Step 3: retry with X-Payment
        console.log('3. Retrying with X-Payment header...');
        const response = await axios.get(GATEWAY_URL, {
            headers: {
                'X-Payment': paymentHeader,
                'X-Agent-Wallet': keypair.publicKey.toBase58()
            }
        });

        console.log('Success! Resource Data:', response.data);
        if (response.headers['x-transaction-id']) {
            console.log('Transaction ID:', response.headers['x-transaction-id']);
        }

    } catch (error: any) {
        console.error('Flow failed:', error.response?.data || error.message);
    }
}

run().catch(console.error);
