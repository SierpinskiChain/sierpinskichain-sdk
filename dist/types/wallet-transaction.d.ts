import type { HdKey } from "./wallet-slip0010.js";
export interface SignedTx {
    /** Sender .sp address */
    from: string;
    /** Recipient .sp address */
    to: string;
    /** Transfer amount in micro-SPC */
    amount: bigint;
    /** Monotonically increasing nonce (per sender) */
    nonce: bigint;
    /** 64-byte ed25519 signature, lowercase hex */
    signature: string;
    /** 32-byte sender public key, lowercase hex */
    pubkey: string;
}
/** The bytes that are signed: from(11) + to(11) + amount(8 LE) + nonce(8 LE) */
export declare function signingBytes(from: string, to: string, amount: bigint, nonce: bigint): Uint8Array;
/** Sign a transfer and return a SignedTx. */
export declare function signTransaction(key: HdKey, from: string, to: string, amount: bigint, nonce: bigint): SignedTx;
/** Verify a SignedTx signature. Returns true if valid. */
export declare function verifyTransaction(tx: SignedTx): boolean;
export declare function toHex(bytes: Uint8Array): string;
export declare function fromHex(hex: string): Uint8Array;
//# sourceMappingURL=wallet-transaction.d.ts.map