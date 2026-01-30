// @ts-nocheck
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { ShadowPayClient } from './clients/shadowPayClient';
import dotenv from 'dotenv';
import { ShadowWireClient } from './clients/shadowWireClient';
dotenv.config();

// Prisma 7: use PostgreSQL adapter for direct database connection
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

// Use MERCHANT_KEY as the API key per user instruction
// Note: Base URL should NOT include /shadowpay as the client endpoints already include it
// Use FACILITATOR_WALLET_ADDRESS as the API key (per api.md documentation)
// The Facilitator is looking to withdraw funds from THEIR escrow account to pay the merchant.
const baseUrl = (process.env.SHADOWPAY_API_URL || 'https://shadow.radr.fun').replace(/\/shadowpay$/, '');
export const shadowPay = new ShadowPayClient(
    baseUrl,
    process.env.MERCHANT_KEY || 'test_key'
);

