"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// GET /api/auth/me - Check session / get current user
router.get('/me', authController_1.getMe);
// POST /api/auth/nonce - Generate authentication challenge
router.post('/nonce', authController_1.generateNonce);
// POST /api/auth/verify - Verify signature and log in
router.post('/verify', authController_1.verifySignature);
// POST /api/auth/logout - Clear session
router.post('/logout', authController_1.logout);
exports.default = router;
