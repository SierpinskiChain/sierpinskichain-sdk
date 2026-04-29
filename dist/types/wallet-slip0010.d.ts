export declare const HARDENED = 2147483648;
export declare const COIN_TYPE = 709;
export declare const ADDRESS_LEN = 11;
export interface HdKey {
    readonly privateKey: Uint8Array;
    readonly chainCode: Uint8Array;
}
/** Derive the master key from a 64-byte seed (SLIP-0010 spec). */
export declare function masterFromSeed(seed: Uint8Array): HdKey;
/**
 * Derive a hardened child key.  The HARDENED flag is added automatically.
 * SLIP-0010 ed25519 only supports hardened derivation.
 */
export declare function deriveChild(parent: HdKey, index: number): HdKey;
/** Derive key at m/44'/709'/0'/0'/index'. */
export declare function derivePath(seed: Uint8Array, index: number): HdKey;
/** Return the 32-byte compressed public key for an HdKey. */
export declare function toPublicKeyBytes(key: HdKey): Uint8Array;
/** Sign a message with an HdKey. Returns 64-byte signature. */
export declare function sign(key: HdKey, message: Uint8Array): Uint8Array;
/** Verify an ed25519 signature. */
export declare function verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
/**
 * Compute the Sierpinski address: lowercase hex of SHA-256(pubkey)[0..4] + ".sp"
 * e.g. "a1b2c3d4.sp"
 */
export declare function toAddress(key: HdKey): string;
/** Stretch 16-byte entropy to a 64-byte seed (matches Zig wallet). */
export declare function seedFromEntropy(entropy: Uint8Array): Uint8Array;
//# sourceMappingURL=wallet-slip0010.d.ts.map