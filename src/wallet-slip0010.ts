/**
 * SLIP-0010 hierarchical key derivation for ed25519.
 * Uses @noble/curves (pure JS, browser-safe) for ed25519 operations.
 * Uses @noble/hashes for HMAC-SHA512 and SHA-256.
 *
 * Derivation path: m/44'/709'/0'/0'/index'
 * (all hardened — required by SLIP-0010 for ed25519)
 */
import { ed25519 } from "@noble/curves/ed25519";
import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";
import { sha256 } from "@noble/hashes/sha256";

export const HARDENED = 0x80000000;
export const COIN_TYPE = 709; // Sierpinski BIP-44 coin type
export const ADDRESS_LEN = 11; // "xxxxxxxx.sp"

export interface HdKey {
  readonly privateKey: Uint8Array; // 32-byte ed25519 seed
  readonly chainCode: Uint8Array;  // 32-byte chain code
}

// ── Key derivation ────────────────────────────────────────────────────────────

/** Derive the master key from a 64-byte seed (SLIP-0010 spec). */
export function masterFromSeed(seed: Uint8Array): HdKey {
  const I = hmac(sha512, new TextEncoder().encode("ed25519 seed"), seed);
  return { privateKey: I.slice(0, 32), chainCode: I.slice(32, 64) };
}

/**
 * Derive a hardened child key.  The HARDENED flag is added automatically.
 * SLIP-0010 ed25519 only supports hardened derivation.
 */
export function deriveChild(parent: HdKey, index: number): HdKey {
  const hindex = (index | HARDENED) >>> 0;
  const data = new Uint8Array(37);
  data[0] = 0x00;
  data.set(parent.privateKey, 1);
  new DataView(data.buffer).setUint32(33, hindex, false /* big-endian */);
  const I = hmac(sha512, parent.chainCode, data);
  return { privateKey: I.slice(0, 32), chainCode: I.slice(32, 64) };
}

/** Derive key at m/44'/709'/0'/0'/index'. */
export function derivePath(seed: Uint8Array, index: number): HdKey {
  const master  = masterFromSeed(seed);
  const purpose = deriveChild(master, 44);
  const coin    = deriveChild(purpose, COIN_TYPE);
  const account = deriveChild(coin, 0);
  const change  = deriveChild(account, 0);
  return deriveChild(change, index);
}

// ── Key operations ────────────────────────────────────────────────────────────

/** Return the 32-byte compressed public key for an HdKey. */
export function toPublicKeyBytes(key: HdKey): Uint8Array {
  return ed25519.getPublicKey(key.privateKey);
}

/** Sign a message with an HdKey. Returns 64-byte signature. */
export function sign(key: HdKey, message: Uint8Array): Uint8Array {
  return ed25519.sign(message, key.privateKey);
}

/** Verify an ed25519 signature. */
export function verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
  return ed25519.verify(signature, message, publicKey);
}

// ── Address derivation ────────────────────────────────────────────────────────

/**
 * Compute the Sierpinski address: lowercase hex of SHA-256(pubkey)[0..4] + ".sp"
 * e.g. "a1b2c3d4.sp"
 */
export function toAddress(key: HdKey): string {
  const pubkey = toPublicKeyBytes(key);
  const hash = sha256(pubkey);
  const hex = Array.from(hash.slice(0, 4), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex}.sp`;
}

// ── Seed stretching ───────────────────────────────────────────────────────────

/** Stretch 16-byte entropy to a 64-byte seed (matches Zig wallet). */
export function seedFromEntropy(entropy: Uint8Array): Uint8Array {
  return hmac(sha512, new TextEncoder().encode("Sierpinski seed v1"), entropy);
}
