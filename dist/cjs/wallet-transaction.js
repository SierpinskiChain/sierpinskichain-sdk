"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signingBytes = signingBytes;
exports.signTransaction = signTransaction;
exports.verifyTransaction = verifyTransaction;
exports.toHex = toHex;
exports.fromHex = fromHex;
/**
 * Signed transaction format, matching the Zig wallet SignedTx struct.
 * All hex strings are lowercase.
 */
const wallet_slip0010_js_1 = require("./wallet-slip0010.js");
/** The bytes that are signed: from(15) + to(15) + amount(8 LE) + nonce(8 LE) */
function signingBytes(from, to, amount, nonce) {
    const buf = new Uint8Array(46);
    const enc = new TextEncoder();
    buf.set(enc.encode(from.slice(0, 15)), 0);
    buf.set(enc.encode(to.slice(0, 15)), 15);
    const view = new DataView(buf.buffer);
    view.setBigUint64(30, amount, true /* little-endian */);
    view.setBigUint64(38, nonce, true /* little-endian */);
    return buf;
}
/** Sign a transfer and return a SignedTx. */
function signTransaction(key, from, to, amount, nonce) {
    const msg = signingBytes(from, to, amount, nonce);
    const sig = (0, wallet_slip0010_js_1.sign)(key, msg);
    const pub = (0, wallet_slip0010_js_1.toPublicKeyBytes)(key);
    return {
        from,
        to,
        amount,
        nonce,
        signature: toHex(sig),
        pubkey: toHex(pub),
    };
}
/** Verify a SignedTx signature. Returns true if valid. */
function verifyTransaction(tx) {
    try {
        const msg = signingBytes(tx.from, tx.to, tx.amount, tx.nonce);
        const sig = fromHex(tx.signature);
        const pub = fromHex(tx.pubkey);
        return (0, wallet_slip0010_js_1.verify)(sig, msg, pub);
    }
    catch {
        return false;
    }
}
// ── Hex helpers ───────────────────────────────────────────────────────────────
function toHex(bytes) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex) {
    if (hex.length % 2 !== 0)
        throw new Error("invalid hex string");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}
//# sourceMappingURL=wallet-transaction.js.map