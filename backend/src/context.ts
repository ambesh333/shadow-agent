// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { ShadowPayClient } from './clients/shadowPayClient';
import dotenv from 'dotenv';
import { ShadowWireClient } from './clients/shadowWireClient';
dotenv.config();

// Prisma 6: datasource URL is configured in schema.prisma
export const prisma = new PrismaClient();

// Use MERCHANT_KEY as the API key per user instruction
// Note: Base URL should NOT include /shadowpay as the client endpoints already include it
// Use FACILITATOR_WALLET_ADDRESS as the API key (per api.md documentation)
// The Facilitator is looking to withdraw funds from THEIR escrow account to pay the merchant.
const baseUrl = (process.env.SHADOWPAY_API_URL || 'https://shadow.radr.fun').replace(/\/shadowpay$/, '');
export const shadowPay = new ShadowPayClient(
    baseUrl,
    process.env.MERCHANT_KEY || 'test_key'
);

