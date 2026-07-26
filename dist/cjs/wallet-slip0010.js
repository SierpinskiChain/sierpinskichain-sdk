"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADDRESS_LEN = exports.COIN_TYPE = exports.HARDENED = void 0;
exports.masterFromSeed = masterFromSeed;
exports.deriveChild = deriveChild;
exports.derivePath = derivePath;
exports.toPublicKeyBytes = toPublicKeyBytes;
exports.sign = sign;
exports.verify = verify;
exports.toAddress = toAddress;
exports.seedFromEntropy = seedFromEntropy;
/**
 * SLIP-0010 hierarchical key derivation for ed25519.
 * Uses @noble/curves (pure JS, browser-safe) for ed25519 operations.
 * Uses @noble/hashes for HMAC-SHA512 and SHA-256.
 *
 * Derivation path: m/44'/709'/0'/0'/index'
 * (all hardened — required by SLIP-0010 for ed25519)
 */
const ed25519_1 = require("@noble/curves/ed25519");
const hmac_1 = require("@noble/hashes/hmac");
const sha512_1 = require("@noble/hashes/sha512");
const blake3_1 = require("@noble/hashes/blake3");
const base58_js_1 = require("./base58.js");
exports.HARDENED = 0x80000000;
exports.COIN_TYPE = 709; // Sierpinski BIP-44 coin type
exports.ADDRESS_LEN = 15; // "xxxxxxxxxxxx.sp"
// ── Key derivation ────────────────────────────────────────────────────────────
/** Derive the master key from a 64-byte seed (SLIP-0010 spec). */
function masterFromSeed(seed) {
    const I = (0, hmac_1.hmac)(sha512_1.sha512, new TextEncoder().encode("ed25519 seed"), seed);
    return { privateKey: I.slice(0, 32), chainCode: I.slice(32, 64) };
}
/**
 * Derive a hardened child key.  The HARDENED flag is added automatically.
 * SLIP-0010 ed25519 only supports hardened derivation.
 */
function deriveChild(parent, index) {
    const hindex = (index | exports.HARDENED) >>> 0;
    const data = new Uint8Array(37);
    data[0] = 0x00;
    data.set(parent.privateKey, 1);
    new DataView(data.buffer).setUint32(33, hindex, false /* big-endian */);
    const I = (0, hmac_1.hmac)(sha512_1.sha512, parent.chainCode, data);
    return { privateKey: I.slice(0, 32), chainCode: I.slice(32, 64) };
}
/** Derive key at m/44'/709'/0'/0'/index'. */
function derivePath(seed, index) {
    const master = masterFromSeed(seed);
    const purpose = deriveChild(master, 44);
    const coin = deriveChild(purpose, exports.COIN_TYPE);
    const account = deriveChild(coin, 0);
    const change = deriveChild(account, 0);
    return deriveChild(change, index);
}
// ── Key operations ────────────────────────────────────────────────────────────
/** Return the 32-byte compressed public key for an HdKey. */
function toPublicKeyBytes(key) {
    return ed25519_1.ed25519.getPublicKey(key.privateKey);
}
/** Sign a message with an HdKey. Returns 64-byte signature. */
function sign(key, message) {
    return ed25519_1.ed25519.sign(message, key.privateKey);
}
/** Verify an ed25519 signature. */
function verify(signature, message, publicKey) {
    return ed25519_1.ed25519.verify(signature, message, publicKey);
}
// ── Address derivation ────────────────────────────────────────────────────────
/**
 * Compute the Sierpinski address: Base58 of Blake3(pubkey)[0..10] + ".sp" (12 chars)
 * e.g. "AGjXpZq4RmTf.sp"
 */
function toAddress(key) {
    const pubkey = toPublicKeyBytes(key);
    const hash = (0, blake3_1.blake3)(pubkey);
    const b58 = (0, base58_js_1.base58Encode)(hash.slice(0, 10));
    return `${b58.slice(0, 12)}.sp`;
}
// ── Seed stretching ───────────────────────────────────────────────────────────
/** Stretch 16-byte entropy to a 64-byte seed (matches Zig wallet). */
function seedFromEntropy(entropy) {
    return (0, hmac_1.hmac)(sha512_1.sha512, new TextEncoder().encode("Sierpinski seed v1"), entropy);
}
//# sourceMappingURL=wallet-slip0010.js.map