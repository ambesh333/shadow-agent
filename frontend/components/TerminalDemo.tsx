'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { depositToPool, getPoolBalance, payWithShadowWire } from '../lib/shadowWire';


type Step = 'welcome' | 'menu' | 'url-input' | 'fetching' | 'payment' | 'unlocked' | 'settle-prompt' | 'dispute-reason' | 'error' | 'deposit-network' | 'deposit-input' | 'depositing';

// ... (rest of imports/interfaces)




interface TerminalLine {
    text: string;
    type: 'normal' | 'success' | 'error' | 'info' | 'prompt';
}

interface MenuOption {
    label: string;
    action: () => void;
}

export default function TerminalDemo() {
    const wallet = useWallet();
    const { connection } = useConnection();
    const { connected, publicKey, signTransaction } = wallet;

    const [currentStep, setCurrentStep] = useState<Step>('welcome');
    const [selectedMenuItem, setSelectedMenuItem] = useState(0);
    const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [unlockedContent, setUnlockedContent] = useState<any>(null);
    const [depositNetwork, setDepositNetwork] = useState<'mainnet' | 'devnet'>('devnet');
    const [depositMenuIndex, setDepositMenuIndex] = useState(0);

    const terminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalHistory]);

    // Focus terminal container on mount and when step changes
    useEffect(() => {
        const container = document.getElementById('terminal-container');
        if (container) {
            container.focus();
        }
    }, [currentStep]);

    // Focus input when needed
    useEffect(() => {
        if (currentStep === 'url-input' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [currentStep]);

    const addLine = (text: string, type: TerminalLine['type'] = 'normal') => {
        setTerminalHistory(prev => [...prev, { text, type }]);
    };

    const clearTerminal = () => {
        setTerminalHistory([]);
    };

    const menuOptions: MenuOption[] = [
        {
            label: 'Test x402 Resource',
            action: () => {
                clearTerminal();
                addLine('Enter target resource URL:', 'prompt');
                setCurrentStep('url-input');
            }
        },
        {
            label: 'Deposit to Escrow',
            action: () => {
                if (!connected || !publicKey) {
                    clearTerminal();
                    addLine('✗ Please connect your wallet first', 'error');
                    addLine('', 'normal');
                    addLine('Press ctrl + c to return to menu...', 'prompt');
                    return;
                }
                clearTerminal();
                addLine('💰 Deposit SOL to ShadowPay Escrow', 'info');
                addLine('', 'normal');
                addLine('This funds your escrow for ZK payments.', 'normal');
                addLine('', 'normal');
                addLine('Select network:', 'prompt');
                setDepositMenuIndex(0);
                setCurrentStep('deposit-network');
            }
        },
        {
            label: 'Check Balance',
            action: async () => {
                if (!connected || !publicKey) {
                    clearTerminal();
                    addLine('✗ Please connect your wallet first', 'error');
                    addLine('', 'normal');
                    addLine('Press ctrl + c to return to menu...', 'prompt');
                    return;
                }
                clearTerminal();
                addLine('💰 Checking ShadowWire Balance...', 'info');

                try {
                    const balance = await getPoolBalance(wallet);

                    // Convert Lamports to SOL (1 SOL = 1,000,000,000 Lamports)
                    const formatSol = (lamports: number) => (lamports / 1_000_000_000).toFixed(9);

                    addLine('', 'normal');
                    addLine('═══════════════════════════════════════════', 'normal');
                    addLine('        SHADOW WIRE BALANCE', 'info');
                    addLine('═══════════════════════════════════════════', 'normal');
                    addLine(`Available:       ${formatSol(balance.available)} SOL`, 'success');
                    addLine(`Deposited:       ${formatSol(balance.deposited)} SOL`, 'normal');
                    addLine(`Withdrawn:       ${formatSol(balance.withdrawn_to_escrow)} SOL`, 'normal');
                    addLine('═══════════════════════════════════════════', 'normal');
                    addLine('', 'normal');
                } catch (e: any) {
                    addLine(`✗ Error: ${e.message}`, 'error');
                }

                addLine('Press ctrl + c to return to menu...', 'prompt');
                // No special step, stay on generic page or redirect
                // We reuse 'unlocked' step behavior for "Press Enter to return"
                setCurrentStep('unlocked');
                // Hack: clear unlockedContent so it doesn't show old content
                setUnlockedContent(null);
            }
        }
    ];

    const handleFetchResource = async (url: string) => {
        setCurrentStep('fetching');
        setIsLoading(true);

        addLine(`Fetching ${url}...`, 'info');

        try {
            const res = await fetch(url);

            if (res.status === 402) {
                const data = await res.json();
                setPaymentData(data.paymentRequirements);
                addLine('✓ Received 402 Payment Required', 'success');
                addLine(`  Amount: ${data.paymentRequirements.maxAmountRequired} SOL`, 'info');
                addLine(`  Resource: ${data.paymentRequirements.description}`, 'info');
                addLine('', 'normal');
                addLine('Press Enter to pay...', 'prompt');
                setCurrentStep('payment');
            } else if (res.ok) {
                const data = await res.json();
                setUnlockedContent(data);
                addLine('✓ Resource already unlocked', 'success');
                setCurrentStep('unlocked');
            } else {
                addLine(`✗ HTTP ${res.status}`, 'error');
                setCurrentStep('error');
            }
        } catch (e: any) {
            addLine(`✗ Error: ${e.message}`, 'error');
            setCurrentStep('error');
        } finally {
            setIsLoading(false);
        }
    };


    const handlePayment = async () => {
        if (!connected || !publicKey || !paymentData) {
            addLine('✗ Wallet not connected', 'error');
            return;
        }

        setIsLoading(true);
        addLine('', 'normal');
        addLine('Connecting to wallet...', 'info');
        addLine('✓ Wallet connected', 'success');
        addLine('', 'normal');
        addLine('Generating ZK Proof & Signing...', 'info');

        try {
            // The backend now maps "NATIVE" -> "SOL" in the requirements, so we can use the token from the response directly.
            // If it's missing, default to 'SOL'.
            const requiredToken = paymentData.extra?.token || 'SOL';

            const amount = Number(paymentData.maxAmountRequired);

            // Execute payment using ShadowWire SDK (transfers funds to facilitator)
            const paymentResult = await payWithShadowWire(
                wallet,
                paymentData.payTo, // Facilitator wallet from 402 response
                amount,
                requiredToken,
                paymentData.resource
            );

            addLine('✓ Payment Proof Generated', 'success');
            addLine('', 'normal');

            // Parse and display transaction signatures for verification
            // ShadowWire returns composite signature like "TX1:xxx TX2:yyy"
            const txSig = paymentResult.tx_signature || '';
            if (txSig.includes('TX1:')) {
                const parts = txSig.split(' ');
                for (const part of parts) {
                    if (part.startsWith('TX1:')) {
                        const sig = part.replace('TX1:', '');
                        addLine(`  TX1 (Escrow):   ${sig.slice(0, 12)}...${sig.slice(-8)}`, 'info');
                    } else if (part.startsWith('TX2:')) {
                        const sig = part.replace('TX2:', '');
                        addLine(`  TX2 (Transfer): ${sig.slice(0, 12)}...${sig.slice(-8)}`, 'info');
                    }
                }
            } else if (txSig) {
                addLine(`  TX: ${txSig.slice(0, 12)}...${txSig.slice(-8)}`, 'info');
            }

            addLine(`  Transfer ID: ${paymentResult.transfer_id}`, 'info');
            addLine(`  Amount: ${(paymentResult.amount / 1e9).toFixed(6)} SOL (hidden on-chain)`, 'info');
            addLine('', 'normal');
            addLine('Accessing resource...', 'info');

            // Construct X-Payment header with new ShadowWire format
            // This format contains tx_signature for on-chain verification
            const payloadObj = {
                version: 1,
                scheme: 'shadowwire',
                payload: {
                    tx_signature: paymentResult.tx_signature,
                    transfer_id: paymentResult.transfer_id,
                    sender: paymentResult.sender,
                    recipient: paymentResult.recipient,
                    amount: paymentResult.amount, // in lamports
                    token: paymentResult.token,
                    timestamp: Date.now(),
                    proof: paymentResult.proof
                }
            };

            const paymentPayload = JSON.stringify(payloadObj);
            const paymentHeader = btoa(paymentPayload);

            const res = await fetch(currentInput, {
                headers: {
                    'X-Payment': paymentHeader,
                    'X-Agent-Wallet': publicKey.toBase58()
                },
            });

            if (res.ok) {
                const contentType = res.headers.get('content-type') || '';
                addLine('✓ Payment successful!', 'success');
                addLine('✓ Resource unlocked', 'success');
                addLine('', 'normal');

                // Check if response is an image
                if (contentType.includes('image/')) {
                    addLine('📷 Downloading image to your computer...', 'info');
                    const blob = await res.blob();
                    const filename = `unlocked_${Date.now()}.${contentType.split('/')[1] || 'png'}`;

                    // Auto-download the image
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);

                    // Get receipt info from headers
                    const receiptCode = res.headers.get('X-Receipt-Code');
                    const autoSettleAt = res.headers.get('X-Auto-Settle-At');
                    const merchantName = res.headers.get('X-Merchant-Name');

                    addLine(`✓ Image saved as: ${filename}`, 'success');
                    addLine(`  Size: ${(blob.size / 1024).toFixed(1)} KB`, 'info');
                    addLine('', 'normal');

                    // Get transaction ID from headers
                    const transactionId = res.headers.get('X-Transaction-ID');

                    // Display receipt
                    if (receiptCode) {
                        addLine('═══════════════════════════════════════════', 'normal');
                        addLine('        PAYMENT RECEIPT', 'info');
                        addLine('═══════════════════════════════════════════', 'normal');
                        addLine(`Receipt ID:      ${receiptCode}`, 'normal');
                        if (merchantName) addLine(`Merchant:        ${merchantName}`, 'normal');
                        const amountInfo = paymentData?.maxAmountRequired || '0';
                        addLine(`Amount:          ${amountInfo} SOL`, 'normal');
                        addLine('───────────────────────────────────────────', 'normal');

                        // Add transaction verification info
                        const txSig = paymentResult.tx_signature || '';
                        if (txSig.includes('TX2:')) {
                            const tx2Match = txSig.match(/TX2:(\S+)/);
                            if (tx2Match) {
                                const tx2Sig = tx2Match[1];
                                addLine(`Transfer TX:     ${tx2Sig.slice(0, 8)}...${tx2Sig.slice(-6)}`, 'info');
                                addLine(`Verify at:       solana.fm/tx/${tx2Sig.slice(0, 20)}...`, 'normal');
                            }
                        }
                        addLine(`Transfer ID:     ${paymentResult.transfer_id}`, 'normal');
                        addLine('───────────────────────────────────────────', 'normal');

                        if (autoSettleAt) {
                            const settleDate = new Date(autoSettleAt);
                            const minutesLeft = Math.round((settleDate.getTime() - Date.now()) / 60000);
                            addLine(`Auto-Approval:   ${minutesLeft} minutes`, 'info');
                            addLine(`Expires At:      ${settleDate.toLocaleTimeString()}`, 'normal');
                        }
                        addLine('───────────────────────────────────────────', 'normal');
                        addLine('[Enter] Confirm OK  |  [D] Dispute', 'prompt');
                        addLine('═══════════════════════════════════════════', 'normal');
                    }

                    setUnlockedContent({
                        type: 'image',
                        filename,
                        size: blob.size,
                        receiptCode,
                        transactionId
                    });
                } else if (contentType.includes('application/json')) {
                    // JSON response - parse and display
                    const data = await res.json();

                    // Display receipt info if present
                    if (data.receiptCode) {
                        addLine('═══════════════════════════════════════════', 'normal');
                        addLine('        PAYMENT RECEIPT', 'info');
                        addLine('═══════════════════════════════════════════', 'normal');
                        addLine(`Receipt ID:      ${data.receiptCode}`, 'normal');
                        if (data.merchantName) addLine(`Merchant:        ${data.merchantName}`, 'normal');
                        if (data.title) addLine(`Resource:        ${data.title}`, 'normal');
                        const amountInfo = paymentData?.maxAmountRequired || data.price || '0';
                        addLine(`Amount:          ${amountInfo} SOL`, 'normal');
                        addLine('───────────────────────────────────────────', 'normal');

                        // Add transaction verification info
                        const txSig = paymentResult.tx_signature || '';
                        if (txSig.includes('TX2:')) {
                            const tx2Match = txSig.match(/TX2:(\S+)/);
                            if (tx2Match) {
                                const tx2Sig = tx2Match[1];
                                addLine(`Transfer TX:     ${tx2Sig.slice(0, 8)}...${tx2Sig.slice(-6)}`, 'info');
                                addLine(`Verify at:       solana.fm/tx/${tx2Sig.slice(0, 20)}...`, 'normal');
                            }
                        }
                        addLine(`Transfer ID:     ${paymentResult.transfer_id}`, 'normal');
                        addLine('───────────────────────────────────────────', 'normal');

                        if (data.autoSettleAt) {
                            const settleDate = new Date(data.autoSettleAt);
                            const minutesLeft = Math.round((settleDate.getTime() - Date.now()) / 60000);
                            addLine(`Auto-Approval:   ${minutesLeft} minutes`, 'info');
                            addLine(`Expires At:      ${settleDate.toLocaleTimeString()}`, 'normal');
                        }
                        addLine('───────────────────────────────────────────', 'normal');
                        addLine('[Enter] Confirm OK  |  [D] Dispute', 'prompt');
                        addLine('═══════════════════════════════════════════', 'normal');
                    } else {
                        addLine('📄 JSON data received:', 'info');
                    }

                    setUnlockedContent(data);
                } else {
                    // Text or link content
                    const text = await res.text();

                    // Check if it's a URL
                    if (text.startsWith('http://') || text.startsWith('https://')) {
                        setUnlockedContent({ type: 'link', url: text });
                        addLine('🔗 Link:', 'info');
                    } else {
                        setUnlockedContent({ type: 'text', content: text });
                        addLine('📝 Content:', 'info');
                    }
                }

                setCurrentStep('unlocked');
            } else {
                addLine(`✗ Payment failed: HTTP ${res.status}`, 'error');
                const errText = await res.text().catch(() => '');
                if (errText) addLine(`  ${errText}`, 'error');
                setCurrentStep('error');
            }
        } catch (e: any) {
            console.error(e);
            addLine(`✗ Error: ${e.message}`, 'error');
            setCurrentStep('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeposit = async (amountStr: string) => {
        if (!connected || !publicKey || !signTransaction) {
            addLine('✗ Wallet not connected', 'error');
            return;
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount < 0) {
            addLine('✗ Invalid amount', 'error');
            addLine('', 'normal');
            addLine('Enter amount in SOL (e.g., 0.1):', 'prompt');
            return;
        }

        setCurrentStep('depositing');
        setIsLoading(true);

        addLine(`💳 Depositing ${amount} SOL via ShadowWire SDK...`, 'info');
        addLine('', 'normal');

        try {
            // Use SDK helper
            const network = depositNetwork; // 'mainnet' | 'devnet'

            addLine(`📡 Requesting deposit transaction (${network})...`, 'info');

            const result = await depositToPool(connection, wallet, amount, network);

            addLine(`✓ Transaction submitted: ${result.signature.slice(0, 8)}...`, 'success');
            addLine('', 'normal');

            addLine(`✓ Deposit successful!`, 'success');
            addLine(`  Amount: ${result.amount} SOL`, 'info');
            addLine(`  TX: ${result.signature}`, 'info');
            addLine('', 'normal');
            addLine('Your escrow is now funded for ZK payments!', 'success');
            addLine('', 'normal');
            addLine('Press ctrl + c to return to menu...', 'prompt');
            setCurrentStep('unlocked');

        } catch (e: any) {
            console.error(e);
            addLine(`✗ Error: ${e.message}`, 'error');
            addLine('', 'normal');
            addLine('Press ctrl + c to return to menu...', 'prompt');
            setCurrentStep('error');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to settle transaction
    const settleTransaction = async (status: 'SETTLED' | 'DISPUTED', reason?: string) => {
        if (!unlockedContent?.receiptCode) return;

        // Find transaction ID from previous response headers (stored in unlockedContent or we need to extract it)
        // Since we didn't store txId explicitly in state, let's assume the backend response includes it.
        // Wait, the backend accessResource returns { transactionId, ... }. 
        // Let's ensure we stored it.

        const txId = unlockedContent.transactionId;
        if (!txId) {
            addLine('✗ Cannot settle: Missing Transaction ID', 'error');
            return;
        }

        setIsLoading(true);
        addLine(status === 'SETTLED' ? 'Confirming receipt...' : 'Submitting dispute...', 'info');

        try {
            const res = await fetch('http://localhost:3001/api/gateway/settle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: txId,
                    status,
                    reason
                })
            });

            const data = await res.json();

            if (res.ok) {
                addLine(`✓ ${data.message}`, 'success');
                if (status === 'DISPUTED') {
                    addLine('  Support will review your case.', 'info');
                }
            } else {
                addLine(`✗ Settlement failed: ${data.error}`, 'error');
            }
        } catch (e: any) {
            addLine(`✗ Error: ${e.message}`, 'error');
        } finally {
            setIsLoading(false);
            addLine('', 'normal');
            addLine('Press ctrl + c to return to menu...', 'prompt');
            setCurrentStep('unlocked'); // Go back to final state wait
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Global shortcuts
        // Ctrl+C - Clear/Reset at any step
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            clearTerminal();
            setCurrentStep('menu');
            setCurrentInput('');
            setPaymentData(null);
            setUnlockedContent(null);
            setIsLoading(false);
            return;
        }

        // Escape - Go back / Restart
        if (e.key === 'Escape') {
            e.preventDefault();
            if (currentStep === 'welcome') {
                // Already at start, do nothing
                return;
            } else if (currentStep === 'menu') {
                // Restart from welcome
                clearTerminal();
                setCurrentStep('welcome');
            } else {
                // Go back to menu from any other step
                clearTerminal();
                setCurrentStep('menu');
                setCurrentInput('');
                setPaymentData(null);
                setUnlockedContent(null);
            }
            return;
        }

        // Step-specific handlers
        if (currentStep === 'welcome') {
            if (e.key === 'Enter') {
                clearTerminal();
                setCurrentStep('menu');
            }
        } else if (currentStep === 'menu') {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedMenuItem(prev => (prev > 0 ? prev - 1 : menuOptions.length - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedMenuItem(prev => (prev < menuOptions.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'Enter') {
                menuOptions[selectedMenuItem].action();
            }
        } else if (currentStep === 'url-input') {
            if (e.key === 'Enter' && currentInput.trim()) {
                handleFetchResource(currentInput);
            }
            // Ctrl+C to clear input only
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                setCurrentInput('');
            }
        } else if (currentStep === 'deposit-network') {
            const networkOptions = ['devnet', 'mainnet'] as const;
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setDepositMenuIndex(prev => (prev > 0 ? prev - 1 : networkOptions.length - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setDepositMenuIndex(prev => (prev < networkOptions.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'Enter') {
                setDepositNetwork(networkOptions[depositMenuIndex]);
                addLine(`✓ Selected: ${networkOptions[depositMenuIndex].toUpperCase()}`, 'success');
                addLine('', 'normal');
                addLine('Enter amount in SOL (e.g., 0.1):', 'prompt');
                setCurrentStep('deposit-input');
            }
        } else if (currentStep === 'deposit-input') {
            if (e.key === 'Enter' && currentInput.trim()) {
                handleDeposit(currentInput);
                setCurrentInput('');
            }
            // Ctrl+C to clear input only
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                setCurrentInput('');
            }
        } else if (currentStep === 'payment') {
            if (e.key === 'Enter' && !isLoading) {
                handlePayment();
            }
        } else if (currentStep === 'unlocked') {
            if (e.key === 'Enter') {
                // Default action: Settle (Confirm receipt)
                settleTransaction('SETTLED');
            } else if (e.key === 'd' || e.key === 'D') {
                // Dispute action
                setCurrentStep('dispute-reason');
                setCurrentInput('');
            }
        } else if (currentStep === 'dispute-reason') {
            if (e.key === 'Enter' && currentInput.trim()) {
                // "Encrypt" the reason before sending (matching frontend's decryption)
                const encryptedReason = btoa(currentInput);
                settleTransaction('DISPUTED', encryptedReason);
            }
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-4xl">
                {/* Terminal Window */}
                <div className="bg-[#1a1a1a] border border-white/10 rounded-t-xl overflow-hidden">
                    {/* Traffic Lights */}
                    <div className="bg-[#2a2a2a] px-4 py-3 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                    </div>

                    {/* Terminal Content */}
                    <div
                        id="terminal-container"
                        ref={terminalRef}
                        className="h-[calc(100vh-250px)] max-h-[500px] overflow-y-auto p-6 font-mono text-sm outline-none"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#FF8E40 #1a1a1a' }}
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                    >
                        {currentStep === 'welcome' && (
                            <div className="flex flex-col items-center justify-center h-full">
                                <pre className="text-[#FF8E40] text-xs mb-8 leading-tight">
                                    {`   _____ _               _              ____              
  / ____| |             | |            |  _ \\             
 | (___ | |__   __ _  __| | _____      | |_) | __ _ _   _ 
  \\___ \\| '_ \\ / _\` |/ _\` |/ _ \\ \\ /\\ / /  _ < / _\` | | | |
  ____) | | | | (_| | (_| | (_) \\ V  V /| |_) | (_| | |_| |
 |_____/|_| |_|\\__,_|\\__,_|\\___/ \\_/\\_/ |____/ \\__,_|\\__, |
                                                       __/ |
                                                      |___/`}
                                </pre>
                                <p className="text-white text-lg mb-2">🤖 Welcome to ShadowPay Agent Demo</p>
                                <p className="text-gray-400 mb-8">Privacy-preserving x402 payment protocol</p>
                                <p className="text-[#FF8E40]">Press <span className="bg-white/10 px-2 py-1 rounded">Enter</span> to start...</p>
                            </div>
                        )}

                        {currentStep === 'menu' && (
                            <div>
                                <p className="text-white mb-4">Select an option:</p>
                                {menuOptions.map((option, i) => (
                                    <div
                                        key={i}
                                        className={`py-2 px-4 mb-2 rounded ${i === selectedMenuItem
                                            ? 'bg-[#FF8E40] text-white'
                                            : 'text-gray-400'
                                            }`}
                                    >
                                        {i === selectedMenuItem ? '> ' : '  '}
                                        {option.label}
                                    </div>
                                ))}
                                <p className="text-gray-500 mt-6 text-xs">
                                    Use ↑↓ to navigate, Enter to select<br />
                                    Esc: Back to menu | Ctrl+C: Reset
                                </p>
                            </div>
                        )}

                        {currentStep === 'deposit-network' && (
                            <div>
                                {terminalHistory.map((line, i) => (
                                    <div
                                        key={i}
                                        className={`mb-1 ${line.type === 'success' ? 'text-[#27c93f]' :
                                            line.type === 'error' ? 'text-[#FF5832]' :
                                                line.type === 'info' ? 'text-[#FFB657]' :
                                                    line.type === 'prompt' ? 'text-[#FF8E40]' :
                                                        'text-gray-300'
                                            }`}
                                    >
                                        {line.text}
                                    </div>
                                ))}
                                <div className="mt-2 space-y-1">
                                    {['Devnet (Testing)', 'Mainnet (Production)'].map((label, i) => (
                                        <div
                                            key={i}
                                            className={`cursor-pointer py-1 ${depositMenuIndex === i ? 'text-[#FF8E40]' : 'text-gray-400'}`}
                                        >
                                            {depositMenuIndex === i ? '> ' : '  '}{label}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-gray-500 mt-4 text-xs">
                                    Use ↑↓ to select, Enter to confirm
                                </p>
                            </div>
                        )}

                        {(currentStep === 'url-input' || currentStep === 'fetching' || currentStep === 'payment' || currentStep === 'unlocked' || currentStep === 'error' || currentStep === 'deposit-input' || currentStep === 'depositing' || currentStep === 'dispute-reason') && (
                            <div>
                                {terminalHistory.map((line, i) => (
                                    <div
                                        key={i}
                                        className={`mb-1 ${line.type === 'success' ? 'text-[#27c93f]' :
                                            line.type === 'error' ? 'text-[#FF5832]' :
                                                line.type === 'info' ? 'text-[#FFB657]' :
                                                    line.type === 'prompt' ? 'text-[#FF8E40]' :
                                                        'text-gray-300'
                                            }`}
                                    >
                                        {line.text}
                                    </div>
                                ))}

                                {currentStep === 'url-input' && (
                                    <div className="flex items-center mt-2">
                                        <span className="text-[#FF8E40] mr-2">&gt;</span>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={currentInput}
                                            onChange={(e) => setCurrentInput(e.target.value)}
                                            className="flex-1 bg-transparent text-white outline-none border-none"
                                            placeholder="https://..."
                                            autoFocus
                                        />
                                    </div>
                                )}

                                {currentStep === 'dispute-reason' && (
                                    <div className="mt-4">
                                        <p className="text-[#FF5832] mb-2">Why are you disputing this transaction?</p>
                                        <div className="flex items-center">
                                            <span className="text-[#FF8E40] mr-2">&gt;</span>
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={currentInput}
                                                onChange={(e) => setCurrentInput(e.target.value)}
                                                className="flex-1 bg-transparent text-white outline-none border-none"
                                                placeholder="Describe the issue..."
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 'deposit-input' && (
                                    <div className="flex items-center mt-2">
                                        <span className="text-[#FF8E40] mr-2">&gt;</span>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={currentInput}
                                            onChange={(e) => setCurrentInput(e.target.value)}
                                            className="flex-1 bg-transparent text-white outline-none border-none"
                                            placeholder="0.1"
                                            autoFocus
                                        />
                                        <span className="text-gray-500 ml-2">SOL</span>
                                    </div>
                                )}

                                {isLoading && (
                                    <div className="text-[#FF8E40] mt-2">
                                        <span className="animate-pulse">...</span>
                                    </div>
                                )}

                                {currentStep === 'payment' && !isLoading && (
                                    <div className="mt-2">
                                        <button
                                            onClick={handlePayment}
                                            className="text-[#FF8E40] hover:text-[#FF5832] cursor-pointer transition-colors"
                                        >
                                            &rarr; Click here or press Enter to continue
                                        </button>
                                    </div>
                                )}

                                {currentStep === 'unlocked' && unlockedContent && (
                                    <div className="mt-4">
                                        {/* Image - already downloaded */}
                                        {unlockedContent.type === 'image' && (
                                            <div className="bg-white/5 border border-white/10 rounded p-4">
                                                <p className="text-[#27c93f]">✓ Image downloaded to your Downloads folder</p>
                                                <p className="text-gray-400 text-sm mt-1">Filename: {unlockedContent.filename}</p>
                                                <p className="text-gray-500 text-xs">Size: {(unlockedContent.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        )}

                                        {/* Link content (supports both frontend 'link' and backend 'LINK'/'VIDEO' types) */}
                                        {(unlockedContent.type === 'link' || unlockedContent.type === 'LINK' || unlockedContent.type === 'VIDEO') && (
                                            <div className="bg-white/5 border border-white/10 rounded p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-bold bg-[#FF8E40]/20 text-[#FF8E40] px-2 py-0.5 rounded">
                                                        {unlockedContent.type.toUpperCase()}
                                                    </span>
                                                </div>
                                                <a
                                                    href={unlockedContent.url || unlockedContent.data}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#FF8E40] hover:text-[#FFB657] underline break-all"
                                                >
                                                    {unlockedContent.url || unlockedContent.data}
                                                </a>
                                                <p className="text-gray-500 text-xs mt-2">Cmd+Click to open</p>
                                            </div>
                                        )}

                                        {/* Text content */}
                                        {unlockedContent.type === 'text' && (
                                            <div className="bg-white/5 border border-white/10 rounded p-4">
                                                <pre className="text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">
                                                    {unlockedContent.content}
                                                </pre>
                                            </div>
                                        )}

                                        {/* Fallback: JSON content if type is not handled above */}
                                        {!['image', 'link', 'text', 'LINK', 'VIDEO'].includes(unlockedContent.type) && (
                                            <div className="bg-white/5 border border-white/10 rounded p-4">
                                                <pre className="text-gray-300 text-xs overflow-x-auto">
                                                    {JSON.stringify(unlockedContent, null, 2)}
                                                </pre>
                                            </div>
                                        )}

                                        {!unlockedContent.receiptCode && (
                                            <p className="text-[#FF8E40] mt-4">Press Enter to return to menu...</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
