import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { prisma } from './context';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

import escrowRoutes from './routes/escrowRoutes';
import authRoutes from './routes/authRoutes';
import resourceRoutes from './routes/resourceRoutes';

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Increased for base64 images

app.use('/api', escrowRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Facilitator Service running on port ${PORT}`);
});

// Handle shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit();
});
