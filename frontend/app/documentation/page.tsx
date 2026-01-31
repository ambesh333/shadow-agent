'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Home, Twitter, ChevronRight } from 'lucide-react';

const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'problem', title: 'The Problem' },
    { id: 'solution', title: 'Our Solution' },
    { id: 'shadowwire', title: 'Shadow Wire Integration' },
    { id: 'ai', title: 'AI-Powered Features' },
    { id: 'architecture', title: 'Architecture' },
    { id: 'api', title: 'API Reference' },
    { id: 'future', title: 'Future Integrations' },
];

export default function DocumentationPage() {
    const [activeSection, setActiveSection] = useState('overview');

    useEffect(() => {
        const handleScroll = () => {
            const sectionElements = sections.map(s => document.getElementById(s.id));
            const scrollPos = window.scrollY + 150;

            for (let i = sectionElements.length - 1; i >= 0; i--) {
                const section = sectionElements[i];
                if (section && section.offsetTop <= scrollPos) {
                    setActiveSection(sections[i].id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Three Column Layout */}
            <div className="flex">
                {/* Left Sidebar - Navigation */}
                <aside className="hidden lg:block w-64 shrink-0 border-r border-white/10 h-screen sticky top-0 overflow-y-auto">
                    <div className="p-6">
                        <Link href="/" className="flex items-center gap-2 mb-8">
                            <span className="text-xl font-bold bg-gradient-to-r from-[#FF8E40] to-[#FFB657] bg-clip-text text-transparent">
                                SA
                            </span>
                            <span className="text-white font-medium">Docs</span>
                        </Link>

                        {/* Quick Links */}
                        <div className="mb-6 space-y-1">
                            <Link href="/" className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-all">
                                <Home size={14} />
                                Home
                            </Link>
                            <Link href="/dashboard/explore" className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-all">
                                <span className="text-[#FF8E40]">◈</span>
                                All Data
                            </Link>
                        </div>

                        <div className="border-t border-white/10 pt-4 mb-2">
                            <span className="text-xs text-gray-600 uppercase tracking-wider px-3">Documentation</span>
                        </div>

                        <nav className="space-y-1">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === section.id
                                        ? 'bg-[#FF8E40]/20 text-[#FF8E40] font-medium'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {activeSection === section.id && <ChevronRight size={14} />}
                                    {section.title}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    <div className="max-w-3xl mx-auto px-6 py-16">
                        {/* Hero Banner */}
                        <div className="mb-16 rounded-2xl overflow-hidden border border-white/10">
                            <img src="/docs/banner3.jpg" alt="Shadow Agent" className="w-full h-auto" />
                        </div>

                        {/* Overview */}
                        <section id="overview" className="mb-20">
                            <h1 className="text-4xl font-bold mb-6">
                                Shadow <span className="text-[#FF8E40]">Agent</span> Documentation
                            </h1>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Shadow Agent is the first privacy-preserving marketplace where AI agents can purchase digital resources using zero-knowledge proofs on Solana. Built on top of Shadow Wire, it enables autonomous AI agents to make payments while keeping transaction amounts completely private.
                            </p>
                            <div className="flex gap-4">
                                <Link href="/dashboard" className="px-6 py-3 bg-[#FF8E40] hover:bg-[#FF5832] text-white font-medium rounded-xl transition-colors">
                                    Get Started
                                </Link>
                                <Link href="/dashboard/demo" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors">
                                    Try Demo
                                </Link>
                            </div>
                        </section>

                        {/* Problem */}
                        <section id="problem" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#FF8E40]/20 rounded-lg flex items-center justify-center text-[#FF8E40] text-sm font-bold">1</span>
                                The Problem
                            </h2>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <h3 className="text-xl font-semibold text-white mb-4">Challenges in AI Agent Economy</h3>
                                <ul className="space-y-4 text-gray-400">
                                    <li className="flex items-start gap-3">
                                        <span className="text-[#FF8E40] mt-1">•</span>
                                        <span><strong className="text-white">No Privacy:</strong> Traditional blockchain transactions expose all payment details publicly, including amounts and wallet addresses.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-[#FF8E40] mt-1">•</span>
                                        <span><strong className="text-white">No Dispute Resolution:</strong> When AI agents receive incorrect or misrepresented resources, there's no mechanism to resolve disputes fairly.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-[#FF8E40] mt-1">•</span>
                                        <span><strong className="text-white">No Trust Layer:</strong> Merchants and AI agents have no way to establish trust in autonomous transactions.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-[#FF8E40] mt-1">•</span>
                                        <span><strong className="text-white">Complex Integration:</strong> Existing payment solutions require significant setup and don't support the x402 payment protocol.</span>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* Solution */}
                        <section id="solution" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#FF8E40]/20 rounded-lg flex items-center justify-center text-[#FF8E40] text-sm font-bold">2</span>
                                Our Solution
                            </h2>

                            <div className="rounded-2xl overflow-hidden border border-white/10 mb-6">
                                <img src="/docs/banner1.jpg" alt="Shadow Agent Solution" className="w-full h-auto" />
                            </div>

                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Shadow Agent provides a complete privacy-first infrastructure for AI-to-merchant transactions:
                            </p>

                            <div className="grid gap-4">
                                <div className="bg-[#111] rounded-xl border border-white/10 p-5">
                                    <h4 className="text-white font-semibold mb-2">🔒 Private Payments</h4>
                                    <p className="text-gray-400 text-sm">Zero-knowledge proofs hide transaction amounts while proving payment validity.</p>
                                </div>
                                <div className="bg-[#111] rounded-xl border border-white/10 p-5">
                                    <h4 className="text-white font-semibold mb-2">🛡️ Escrow Protection</h4>
                                    <p className="text-gray-400 text-sm">Funds are held in escrow until resources are delivered and verified.</p>
                                </div>
                                <div className="bg-[#111] rounded-xl border border-white/10 p-5">
                                    <h4 className="text-white font-semibold mb-2">🤖 AI Dispute Resolution</h4>
                                    <p className="text-gray-400 text-sm">Automated AI analysis determines dispute validity with confidence scoring.</p>
                                </div>
                                <div className="bg-[#111] rounded-xl border border-white/10 p-5">
                                    <h4 className="text-white font-semibold mb-2">📡 x402 Compatible</h4>
                                    <p className="text-gray-400 text-sm">Full support for the HTTP 402 Payment Required protocol for seamless agent integration.</p>
                                </div>
                            </div>
                        </section>

                        {/* Shadow Wire Integration */}
                        <section id="shadowwire" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#FF8E40]/20 rounded-lg flex items-center justify-center text-[#FF8E40] text-sm font-bold">3</span>
                                Shadow Wire Integration
                            </h2>

                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Shadow Agent leverages Shadow Wire's zero-knowledge infrastructure for private payments:
                            </p>

                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <h3 className="text-xl font-semibold text-white mb-4">How It Works</h3>
                                <ol className="space-y-4 text-gray-400">
                                    <li className="flex items-start gap-3">
                                        <span className="w-6 h-6 bg-[#FF8E40] text-black text-xs font-bold rounded-full flex items-center justify-center shrink-0">1</span>
                                        <span><strong className="text-white">Deposit:</strong> Users deposit SOL into the Shadow Wire pool, receiving a private balance.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="w-6 h-6 bg-[#FF8E40] text-black text-xs font-bold rounded-full flex items-center justify-center shrink-0">2</span>
                                        <span><strong className="text-white">Proof Generation:</strong> Zero-knowledge range proofs are generated locally using WASM.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="w-6 h-6 bg-[#FF8E40] text-black text-xs font-bold rounded-full flex items-center justify-center shrink-0">3</span>
                                        <span><strong className="text-white">Internal Transfer:</strong> Funds move to a facilitator wallet without revealing the amount.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="w-6 h-6 bg-[#FF8E40] text-black text-xs font-bold rounded-full flex items-center justify-center shrink-0">4</span>
                                        <span><strong className="text-white">Escrow:</strong> Payment is held until resource delivery is confirmed or disputed.</span>
                                    </li>
                                </ol>
                            </div>

                            <div className="bg-gradient-to-r from-[#FF8E40]/10 to-transparent rounded-xl border border-[#FF8E40]/20 p-5">
                                <p className="text-[#FFB657] text-sm">
                                    <strong>Note:</strong> All proofs are generated client-side. Your private balance never leaves your control until you authorize a payment.
                                </p>
                            </div>
                        </section>

                        {/* AI Features */}
                        <section id="ai" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#FF8E40]/20 rounded-lg flex items-center justify-center text-[#FF8E40] text-sm font-bold">4</span>
                                AI-Powered Features
                            </h2>

                            <div className="rounded-2xl overflow-hidden border border-white/10 mb-6">
                                <img src="/docs/banner2.jpg" alt="AI Features" className="w-full h-auto" />
                            </div>

                            <div className="space-y-6">
                                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-xl font-semibold text-white mb-4">🧠 AI Dispute Analyzer</h3>
                                    <p className="text-gray-400 mb-4">
                                        When an AI agent disputes a resource, our AI system analyzes:
                                    </p>
                                    <ul className="space-y-2 text-gray-400 text-sm">
                                        <li>• Resource title and description vs actual content</li>
                                        <li>• Agent's reason for disputing</li>
                                        <li>• Merchant's explanation (if provided)</li>
                                        <li>• Historical patterns and similar cases</li>
                                    </ul>
                                    <p className="text-gray-400 mt-4">
                                        The AI provides a <span className="text-[#FF8E40]">confidence score</span> and detailed reasoning, enabling fair and transparent resolutions.
                                    </p>
                                </div>

                                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-xl font-semibold text-white mb-4">🤖 Agent Simulation</h3>
                                    <p className="text-gray-400">
                                        Test the entire payment flow from an AI agent's perspective using our terminal-based demo. Experience x402 payment headers, resource access, and dispute filing—all in a simulated environment.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Architecture */}
                        <section id="architecture" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#FF8E40]/20 rounded-lg flex items-center justify-center text-[#FF8E40] text-sm font-bold">5</span>
                                Architecture
                            </h2>

                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <pre className="text-sm text-gray-400 overflow-x-auto">
                                    {`┌─────────────────────────────────────────────────────────────┐
│                      AI Agent                                │
│  (Requests resource with x402 payment header)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Shadow Agent API                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐   │
│  │ Resources │  │   Auth    │  │   Dispute Resolution  │   │
│  │  (x402)   │  │  (Wallet) │  │      (AI-powered)     │   │
│  └───────────┘  └───────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Shadow Wire Layer                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐   │
│  │  Deposits │  │ ZK Proofs │  │   Internal Transfers  │   │
│  │   (Pool)  │  │  (WASM)   │  │     (Private)         │   │
│  └───────────┘  └───────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Solana                               │
│              (Settlement & Verification)                    │
└─────────────────────────────────────────────────────────────┘`}
                                </pre>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                    <h4 className="text-white font-medium mb-2">Frontend</h4>
                                    <p className="text-gray-500 text-sm">Next.js 16, React 19, TailwindCSS</p>
                                </div>
                                <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                    <h4 className="text-white font-medium mb-2">Backend</h4>
                                    <p className="text-gray-500 text-sm">Node.js, Express, Prisma 7</p>
                                </div>
                                <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                    <h4 className="text-white font-medium mb-2">Database</h4>
                                    <p className="text-gray-500 text-sm">PostgreSQL (Neon)</p>
                                </div>
                                <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                    <h4 className="text-white font-medium mb-2">AI</h4>
                                    <p className="text-gray-500 text-sm">Google Gemini API</p>
                                </div>
                            </div>
                        </section>

                        {/* API Reference */}
                        <section id="api" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#FF8E40]/20 rounded-lg flex items-center justify-center text-[#FF8E40] text-sm font-bold">6</span>
                                API Reference
                            </h2>

                            <p className="text-gray-400 text-lg mb-4">
                                AI agents can interact with Shadow Agent using these endpoints:
                            </p>

                            <div className="bg-gradient-to-r from-[#FF8E40]/10 to-transparent rounded-xl border border-[#FF8E40]/20 p-4 mb-6">
                                <p className="text-[#FFB657] text-sm font-mono">
                                    Base URL: <span className="text-white">https://shadow.radr.fun/shadowpay</span>
                                </p>
                            </div>

                            {/* List Resources */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">GET</span>
                                    <code className="text-white font-mono">/api/explore</code>
                                </div>
                                <p className="text-gray-400 text-sm mb-4">List all available resources with trust scores (public, no auth required).</p>
                                <div className="bg-black rounded-lg p-4">
                                    <pre className="text-sm text-gray-400 overflow-x-auto">{`// Response
{
  "resources": [
    {
      "id": "abc123",
      "title": "Premium Dataset",
      "description": "High-quality training data",
      "type": "LINK",
      "price": 0.001,
      "network": "MAINNET",
      "token": "NATIVE",
      "trustScore": 85,
      "trustLabel": "Excellent"
    }
  ],
  "count": 1
}`}</pre>
                                </div>
                            </div>

                            {/* Get Resource Details */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">GET</span>
                                    <code className="text-white font-mono">/api/explore/:id</code>
                                </div>
                                <p className="text-gray-400 text-sm mb-4">Get resource details including payment info and trust score.</p>
                                <div className="bg-black rounded-lg p-4">
                                    <pre className="text-sm text-gray-400 overflow-x-auto">{`// Response
{
  "resource": {
    "id": "abc123",
    "title": "Premium Dataset",
    "trustScore": 85,
    "trustLabel": "Excellent"
  },
  "payment": {
    "required": true,
    "amount": 0.001,
    "token": "NATIVE",
    "accessEndpoint": "/api/gateway/resource/abc123"
  }
}`}</pre>
                                </div>
                            </div>

                            {/* Access Resource (x402) */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-mono rounded">GET</span>
                                    <code className="text-white font-mono">/api/gateway/resource/:id</code>
                                </div>
                                <p className="text-gray-400 text-sm mb-4">Primary endpoint for AI agents. Returns 402 with payment info if payment required.</p>
                                <div className="bg-black rounded-lg p-4 mb-4">
                                    <pre className="text-sm text-gray-400 overflow-x-auto">{`// 402 Response Headers
X-Payment-Required: true
X-Payment-Amount: 1000000  // lamports
X-Payment-Token: NATIVE
X-Payment-Network: MAINNET
X-Resource-ID: abc123`}</pre>
                                </div>
                            </div>

                            {/* Pay for Resource */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-mono rounded">POST</span>
                                    <code className="text-white font-mono">/api/gateway/pay</code>
                                </div>
                                <p className="text-gray-400 text-sm mb-4">Pay for and access a resource with ZK proof.</p>
                                <div className="bg-black rounded-lg p-4">
                                    <pre className="text-sm text-gray-400 overflow-x-auto">{`// Request Body
{
  "resourceId": "abc123",
  "paymentHeader": {
    "tx_signature": "5abc...",
    "transfer_id": "zkint_123",
    "sender": "An3Xagent...",
    "recipient": "4RWb4myx...",
    "amount": 1000000
  }
}

// Success Response
{
  "success": true,
  "transaction": { "id": "tx_456", "status": "PENDING" },
  "content": { ... },
  "receiptCode": "receipt_789"
}`}</pre>
                                </div>
                            </div>

                            {/* Settle Transaction */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-mono rounded">POST</span>
                                    <code className="text-white font-mono">/api/gateway/settle</code>
                                </div>
                                <p className="text-gray-400 text-sm mb-4">Confirm delivery (releases funds) or file a dispute. Used by both agents and merchants.</p>
                                <div className="bg-black rounded-lg p-4">
                                    <pre className="text-sm text-gray-400 overflow-x-auto">{`// Confirm Delivery Request
{
  "transactionId": "tx_456",
  "status": "SETTLED"
}

// Dispute Request  
{
  "transactionId": "tx_456",
  "status": "DISPUTED",
  "reason": "Resource content does not match description"
}

// Response
{
  "success": true,
  "message": "Transaction updated"
}`}</pre>
                                </div>
                            </div>
                        </section>

                        {/* Future */}
                        <section id="future" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#FF8E40]/20 rounded-lg flex items-center justify-center text-[#FF8E40] text-sm font-bold">7</span>
                                Future Integrations
                            </h2>

                            <div className="space-y-4">
                                <div className="bg-gradient-to-r from-[#FF8E40]/10 to-transparent rounded-xl border border-[#FF8E40]/20 p-5">
                                    <h4 className="text-white font-semibold mb-2">🔗 Multi-Chain Support</h4>
                                    <p className="text-gray-400 text-sm">Expand beyond Solana to support Ethereum, Base, and other EVM chains.</p>
                                </div>
                                <div className="bg-gradient-to-r from-[#FF8E40]/10 to-transparent rounded-xl border border-[#FF8E40]/20 p-5">
                                    <h4 className="text-white font-semibold mb-2">🪙 Multi-Token Payments</h4>
                                    <p className="text-gray-400 text-sm">Support for USDC, USDT, and other stablecoins alongside SOL.</p>
                                </div>
                                <div className="bg-gradient-to-r from-[#FF8E40]/10 to-transparent rounded-xl border border-[#FF8E40]/20 p-5">
                                    <h4 className="text-white font-semibold mb-2">📦 SDK & Libraries</h4>
                                    <p className="text-gray-400 text-sm">NPM packages for easy integration into AI agent frameworks.</p>
                                </div>
                                <div className="bg-gradient-to-r from-[#FF8E40]/10 to-transparent rounded-xl border border-[#FF8E40]/20 p-5">
                                    <h4 className="text-white font-semibold mb-2">🤖 Agent Framework Plugins</h4>
                                    <p className="text-gray-400 text-sm">Native plugins for LangChain, AutoGPT, and other popular frameworks.</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>

                {/* Right Sidebar - Links */}
                <aside className="hidden xl:block w-56 shrink-0 border-l border-white/10 h-screen sticky top-0">
                    <div className="p-6">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Quick Links</h4>
                        <div className="space-y-3">
                            <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm">
                                <Home size={16} />
                                Home
                            </Link>
                            <a href="https://x.com/0xAmbesh" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm">
                                <Twitter size={16} />
                                Twitter
                            </a>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
