/** Encode 16 bytes of entropy as 16 mnemonic words. */
export declare function entropyToMnemonic(entropy: Uint8Array): string[];
/**
 * Decode 16 mnemonic words back to 16 bytes of entropy.
 * Returns null if any word is not in the list.
 */
export declare function mnemonicToEntropy(words: string[]): Uint8Array | null;
/** Generate 16 bytes of random entropy using the platform CSPRNG. */
export declare function generateEntropy(): Uint8Array;
//# sourceMappingURL=wallet-mnemonic.d.ts.map