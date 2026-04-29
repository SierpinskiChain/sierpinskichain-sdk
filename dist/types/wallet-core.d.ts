import type { HdKey } from "./wallet-slip0010.js";
import type { SignedTx } from "./wallet-transaction.js";
export declare class HdWallet {
    #private;
    private constructor();
    /** Create a new random wallet. */
    static generate(): HdWallet;
    /** Restore a wallet from a 16-word mnemonic. Returns null if any word is invalid. */
    static fromMnemonic(words: string[]): HdWallet | null;
    /** Create a wallet from raw 16-byte entropy. */
    static fromEntropy(entropy: Uint8Array): HdWallet;
    /** Return the 16-word mnemonic for this wallet. */
    get mnemonicWords(): string[];
    /** Return the mnemonic as a space-separated string. */
    get mnemonic(): string;
    /** Derive (and cache) the HD key for account `index`. */
    deriveAccount(index: number): HdKey;
    /** Return the .sp address for account `index`. */
    address(index: number): string;
    /** Return the hex-encoded public key for account `index`. */
    publicKey(index: number): string;
    /**
     * Sign a transfer from account `fromIndex` to `toAddress`.
     * Returns a SignedTx ready to submit to `SierpinskiClient.sendTransaction()`.
     */
    sign(fromIndex: number, to: string, amount: bigint): SignedTx;
    /**
     * Estimate fee for a transfer (placeholder — returns a fixed fee until
     * the node exposes fee estimation via RPC).
     */
    estimateFee(_amount: bigint): bigint;
    /** Export mnemonic as newline-terminated space-separated words (wallet file format). */
    toFileString(): string;
    /** Parse a wallet file string back into an HdWallet. */
    static fromFileString(content: string): HdWallet | null;
}
//# sourceMappingURL=wallet-core.d.ts.map