// import {
//     ShadowWireClient,
//     RecipientNotFoundError,
//     TokenUtils
// } from '@radr/shadowwire';

import {
    initWASM,
    generateRangeProof,
    verifyRangeProof,
    isWASMSupported,
    BULLETPROOF_INFO
} from './zkProofs';

import {
    TokenUtils
} from './tokens';

initWASM();

// export const shadowWireClient = new ShadowWireClient();

export {
    // RecipientNotFoundError,
    initWASM,
    generateRangeProof,
    verifyRangeProof,
    isWASMSupported,
    BULLETPROOF_INFO,
    TokenUtils
};
