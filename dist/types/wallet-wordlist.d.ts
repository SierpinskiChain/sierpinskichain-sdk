/**
 * 256-word list for Sierpinski HD wallet mnemonics.
 * Each word encodes one byte (0–255).  Identical to the Zig implementation
 * in wallet.zig so mnemonics are interoperable.
 */
export declare const WORD_LIST: readonly string[];
export declare const WORD_COUNT = 256;
export declare const MNEMONIC_WORDS = 16;
export declare const ENTROPY_BYTES = 16;
/** Return the index of a word, or -1 if not in the list. */
export declare function wordIndex(word: string): number;
//# sourceMappingURL=wallet-wordlist.d.ts.map