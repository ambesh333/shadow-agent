'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ShadowPay } from '@shadowpay/client';

type Step = 'welcome' | 'menu' | 'url-input' | 'fetching' | 'payment' | 'unlocked' | 'error';

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
    const { connected, publicKey } = wallet;

    const [currentStep, setCurrentStep] = useState<Step>('welcome');
    const [selectedMenuItem, setSelectedMenuItem] = useState(0);
    const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [unlockedContent, setUnlockedContent] = useState<any>(null);

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
            label: 'View Saved URLs',
            action: () => {
                clearTerminal();
                const saved = localStorage.getItem('x402_registered_urls');
                if (saved) {
                    const urls = JSON.parse(saved);
                    addLine('Saved URLs:', 'info');
                    urls.forEach((url: string, i: number) => {
                        addLine(`  ${i + 1}. ${url}`, 'normal');
                    });
                } else {
                    addLine('No saved URLs', 'info');
                }
                addLine('', 'normal');
                addLine('Press Enter to return to menu...', 'prompt');
            }
        },
        {
            label: 'Clear History',
            action: () => {
                localStorage.removeItem('x402_registered_urls');
                clearTerminal();
                addLine('✓ History cleared', 'success');
                addLine('', 'normal');
                addLine('Press Enter to return to menu...', 'prompt');
            }
        },
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
        addLine('Signing transaction...', 'info');

        try {
            // Initialize ShadowPay client with merchant info from paymentData
            const client = new ShadowPay({
                merchantKey: paymentData.merchantKey,
                merchantWallet: paymentData.payTo,
            });

            // Execute payment with proper options
            // Map "NATIVE" token to "SOL" for SDK
            const token = paymentData.extra?.token === 'NATIVE' ? 'SOL' : (paymentData.extra?.token || 'SOL');
            const paymentResult = await client.pay({
                amount: Number(paymentData.maxAmountRequired),
                token: token,
                wallet: wallet as any,
            });

            addLine('✓ Transaction signed', 'success');
            addLine('', 'normal');
            addLine('Processing payment...', 'info');

            // Use access token to fetch resource
            const res = await fetch(currentInput, {
                headers: {
                    'X-Payment': paymentResult.accessToken,
                    'X-Agent-Wallet': publicKey.toBase58()
                },
            });

            if (res.ok) {
                const data = await res.json();
                setUnlockedContent(data);
                addLine('✓ Payment successful!', 'success');
                addLine('✓ Resource unlocked', 'success');
                setCurrentStep('unlocked');
            } else {
                addLine(`✗ Payment failed: HTTP ${res.status}`, 'error');
                setCurrentStep('error');
            }
        } catch (e: any) {
            addLine(`✗ Error: ${e.message}`, 'error');
            setCurrentStep('error');
        } finally {
            setIsLoading(false);
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
        } else if (currentStep === 'payment') {
            if (e.key === 'Enter' && !isLoading) {
                handlePayment();
            }
        } else if (['unlocked', 'error'].includes(currentStep)) {
            if (e.key === 'Enter') {
                clearTerminal();
                setCurrentStep('menu');
                setCurrentInput('');
                setPaymentData(null);
                setUnlockedContent(null);
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

                        {(currentStep === 'url-input' || currentStep === 'fetching' || currentStep === 'payment' || currentStep === 'unlocked' || currentStep === 'error') && (
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
                                        <div className="bg-white/5 border border-white/10 rounded p-4">
                                            <pre className="text-gray-300 text-xs overflow-x-auto">
                                                {JSON.stringify(unlockedContent, null, 2)}
                                            </pre>
                                        </div>
                                        <p className="text-[#FF8E40] mt-4">Press Enter to return to menu...</p>
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
