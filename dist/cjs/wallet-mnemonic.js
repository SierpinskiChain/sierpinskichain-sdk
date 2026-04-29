"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entropyToMnemonic = entropyToMnemonic;
exports.mnemonicToEntropy = mnemonicToEntropy;
exports.generateEntropy = generateEntropy;
/**
 * Mnemonic encoding/decoding.
 * 16 random bytes → 16 words (one word per byte, index into WORD_LIST).
 * Fully interoperable with the Zig wallet implementation.
 */
const wallet_wordlist_js_1 = require("./wallet-wordlist.js");
/** Encode 16 bytes of entropy as 16 mnemonic words. */
function entropyToMnemonic(entropy) {
    if (entropy.length !== wallet_wordlist_js_1.ENTROPY_BYTES) {
        throw new RangeError(`entropy must be ${wallet_wordlist_js_1.ENTROPY_BYTES} bytes, got ${entropy.length}`);
    }
    return Array.from(entropy, (b) => wallet_wordlist_js_1.WORD_LIST[b]);
}
/**
 * Decode 16 mnemonic words back to 16 bytes of entropy.
 * Returns null if any word is not in the list.
 */
function mnemonicToEntropy(words) {
    if (words.length !== wallet_wordlist_js_1.MNEMONIC_WORDS)
        return null;
    const entropy = new Uint8Array(wallet_wordlist_js_1.ENTROPY_BYTES);
    for (let i = 0; i < wallet_wordlist_js_1.MNEMONIC_WORDS; i++) {
        const idx = (0, wallet_wordlist_js_1.wordIndex)(words[i] ?? "");
        if (idx < 0)
            return null;
        entropy[i] = idx;
    }
    return entropy;
}
/** Generate 16 bytes of random entropy using the platform CSPRNG. */
function generateEntropy() {
    return crypto.getRandomValues(new Uint8Array(wallet_wordlist_js_1.ENTROPY_BYTES));
}
//# sourceMappingURL=wallet-mnemonic.js.map