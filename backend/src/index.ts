import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './context';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

import escrowRoutes from './routes/escrowRoutes';

app.use(cors());
app.use(express.json());

app.use('/api', escrowRoutes);

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
