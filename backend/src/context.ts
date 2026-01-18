// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { ShadowPayClient } from './clients/shadowPayClient';
import dotenv from 'dotenv';

dotenv.config();

// Prisma 6: datasource URL is configured in schema.prisma
export const prisma = new PrismaClient();

export const shadowPay = new ShadowPayClient(
    process.env.SHADOW_API_URL || 'https://shadow.radr.fun',
    process.env.SHADOW_API_KEY || 'test_key'
);
