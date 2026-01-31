import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { prisma } from './context';
import { startAutoSettleJob } from './jobs/autoSettleJob';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

import escrowRoutes from './routes/escrowRoutes';
import authRoutes from './routes/authRoutes';
import resourceRoutes from './routes/resourceRoutes';
import gatewayRoutes from './routes/gatewayRoutes';
import disputeRoutes from './routes/disputeRoutes';
import exploreRoutes from './routes/exploreRoutes';

const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://shadow-agent-henna.vercel.app',
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if the origin is in the allowed list
        const isAllowed = allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app'); // Flexible for Vercel previews

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    exposedHeaders: ['X-Receipt-Code', 'X-Auto-Settle-At', 'X-Merchant-Name', 'X-Transaction-ID', 'X-Payment-Required', 'X-Payment-Amount', 'X-Payment-Token', 'X-Payment-Recipient', 'X-Payment-Network', 'X-Resource-ID']
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Increased for base64 images

app.use('/api/gateway', gatewayRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/explore', exploreRoutes);  // Public routes for AI agents

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Auto-settle job interval reference
let autoSettleInterval: NodeJS.Timeout | null = null;

// Start server
app.listen(PORT, () => {
    console.log(`Facilitator Service running on port ${PORT}`);

    // Start auto-settle job (runs every minute)
    autoSettleInterval = startAutoSettleJob(60000);
});

// Handle shutdown
process.on('SIGINT', async () => {
    // Clear auto-settle interval
    if (autoSettleInterval) {
        clearInterval(autoSettleInterval);
    }
    await prisma.$disconnect();
    process.exit();
});
