import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const RESOURCE_ID = 'YOUR_RESOURCE_ID'; // Replace with a valid ID from your DB
const AGENT_HEADER = 'YOUR_ZK_PROOF_HEADER'; // Mock or real zkp header

async function testFlow() {
    console.log('--- Starting Verification Flow ---');

    try {
        // 1. Initial Access (Should 402)
        console.log('\n1. Requesting access (no payment)...');
        try {
            await axios.get(`${BASE_URL}/api/gateway/resource/${RESOURCE_ID}`);
        } catch (error: any) {
            console.log('Response status:', error.response?.status);
            console.log('Payment Requirements:', JSON.stringify(error.response?.data.paymentRequirements, null, 2));
        }

        // 2. Pay and Access (In a real scenario, we provide a ZK proof)
        // For testing, we might need a mock 'X-Payment' that the ShadowPay API accepts or the client mocks.
        console.log('\n2. Providing payment proof (mock)...');
        // This part requires a valid paymentHeader or a mock environment.
        // Assuming we have one:
        /*
        const response = await axios.get(`${BASE_URL}/api/gateway/resource/${RESOURCE_ID}`, {
            headers: { 'X-Payment': AGENT_HEADER }
        });
        const txId = response.headers['x-transaction-id'];
        console.log('Transaction ID:', txId);
        */

        // 3. Settle OK
        /*
        console.log('\n3. Finalizing transaction...');
        const settleRes = await axios.post(`${BASE_URL}/api/settle`, {
            transactionId: txId,
            status: 'OK'
        });
        console.log('Settle Result:', settleRes.data);
        */

        // 4. Dispute Flow
        /*
        console.log('\n4. Testing Dispute...');
        const disputeRes = await axios.post(`${BASE_URL}/api/dispute`, {
            transactionId: txId,
            encryptedReason: 'Data was corrupted'
        });
        console.log('Dispute Result:', disputeRes.data);
        */

        // 5. Resolve Dispute
        /*
        console.log('\n5. Resolving Dispute (Refund)...');
        const resolveRes = await axios.post(`${BASE_URL}/api/resolve-dispute`, {
            transactionId: txId,
            decision: 'REFUND'
        });
        console.log('Resolve Result:', resolveRes.data);
        */

    } catch (error: any) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

// testFlow();
console.log('Verification script ready. Note: Requires live connection or manual mock setup.');
