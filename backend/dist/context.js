"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shadowPay = exports.prisma = void 0;
// @ts-nocheck
const client_1 = require("@prisma/client");
const shadowPayClient_1 = require("./clients/shadowPayClient");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// @ts-ignore
exports.prisma = new client_1.PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
});
exports.shadowPay = new shadowPayClient_1.ShadowPayClient(process.env.SHADOW_API_URL || 'https://shadow.radr.fun', process.env.SHADOW_API_KEY || 'test_key');
