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
exports.logout = exports.verifySignature = exports.generateNonce = exports.getMe = void 0;
const context_1 = require("../context");
const crypto_1 = __importDefault(require("crypto"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const NONCE_EXPIRY_MINUTES = 5;
const JWT_EXPIRY = '7d';
// Helper to construct the SIWS message
function constructSiwsMessage(domain, publicKey, nonce, issuedAt) {
    return `${domain} wants you to sign in with your Solana account:
${publicKey}

Sign in to ${domain}

URI: https://${domain}
Version: 1
Chain ID: solana:mainnet
Nonce: ${nonce}
Issued At: ${issuedAt}`;
}
// GET /api/auth/me - Check session
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.session_token;
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const merchant = yield context_1.prisma.merchant.findUnique({
            where: { id: decoded.merchantId }
        });
        if (!merchant) {
            return res.status(401).json({ error: 'Merchant not found' });
        }
        return res.json({
            user: {
                id: merchant.id,
                walletAddress: merchant.walletAddress,
                displayName: merchant.displayName
            }
        });
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
});
exports.getMe = getMe;
// POST /api/auth/nonce - Generate challenge nonce
const generateNonce = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { publicKey } = req.body;
        if (!publicKey || typeof publicKey !== 'string') {
            return res.status(400).json({ error: 'publicKey is required' });
        }
        // Generate a random nonce
        const nonce = crypto_1.default.randomBytes(32).toString('base64');
        const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000);
        // Store the challenge
        const challenge = yield context_1.prisma.authChallenge.create({
            data: {
                walletAddress: publicKey,
                nonce,
                expiresAt
            }
        });
        return res.json({
            nonce: challenge.nonce,
            challengeId: challenge.id,
            expiresAt: challenge.expiresAt.toISOString()
        });
    }
    catch (error) {
        console.error('Nonce generation error:', error);
        return res.status(500).json({ error: 'Failed to generate nonce' });
    }
});
exports.generateNonce = generateNonce;
// POST /api/auth/verify - Verify signature and issue JWT
const verifySignature = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { publicKey, signature, message, challengeId } = req.body;
        if (!publicKey || !signature || !message) {
            return res.status(400).json({ error: 'publicKey, signature, and message are required' });
        }
        // Find the challenge
        const challenge = yield context_1.prisma.authChallenge.findFirst({
            where: challengeId
                ? { id: challengeId, walletAddress: publicKey }
                : { walletAddress: publicKey, used: false }
        });
        if (!challenge) {
            return res.status(401).json({ error: 'Challenge not found' });
        }
        if (challenge.used) {
            return res.status(401).json({ error: 'Challenge already used (replay attack prevention)' });
        }
        if (new Date() > challenge.expiresAt) {
            return res.status(401).json({ error: 'Challenge expired' });
        }
        // Verify the nonce is in the message
        if (!message.includes(challenge.nonce)) {
            return res.status(401).json({ error: 'Nonce mismatch' });
        }
        // Verify the signature using ed25519
        let isValid = false;
        try {
            const messageBytes = new TextEncoder().encode(message);
            const signatureBytes = bs58_1.default.decode(signature);
            const publicKeyBytes = bs58_1.default.decode(publicKey);
            isValid = tweetnacl_1.default.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        }
        catch (e) {
            console.error('Signature verification error:', e);
            return res.status(401).json({ error: 'Invalid signature format' });
        }
        if (!isValid) {
            return res.status(401).json({ error: 'Signature verification failed' });
        }
        // Mark challenge as used
        yield context_1.prisma.authChallenge.update({
            where: { id: challenge.id },
            data: { used: true }
        });
        // Find or create the merchant
        let merchant = yield context_1.prisma.merchant.findUnique({
            where: { walletAddress: publicKey }
        });
        if (!merchant) {
            // New signup
            merchant = yield context_1.prisma.merchant.create({
                data: {
                    walletAddress: publicKey,
                    lastLogin: new Date()
                }
            });
        }
        else {
            // Existing user - update last login
            merchant = yield context_1.prisma.merchant.update({
                where: { id: merchant.id },
                data: { lastLogin: new Date() }
            });
        }
        // Issue JWT
        const token = jsonwebtoken_1.default.sign({ walletAddress: publicKey, merchantId: merchant.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        // Set httpOnly cookie
        res.cookie('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.json({
            user: {
                id: merchant.id,
                walletAddress: merchant.walletAddress,
                displayName: merchant.displayName,
                isNewUser: !merchant.displayName
            }
        });
    }
    catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ error: 'Verification failed' });
    }
});
exports.verifySignature = verifySignature;
// POST /api/auth/logout - Clear session
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.clearCookie('session_token');
    return res.json({ success: true });
});
exports.logout = logout;
