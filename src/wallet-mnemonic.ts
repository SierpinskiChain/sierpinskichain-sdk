/**
 * Mnemonic encoding/decoding.
 * 16 random bytes → 16 words (one word per byte, index into WORD_LIST).
 * Fully interoperable with the Zig wallet implementation.
 */
import { WORD_LIST, MNEMONIC_WORDS, ENTROPY_BYTES, wordIndex } from "./wallet-wordlist.js";

/** Encode 16 bytes of entropy as 16 mnemonic words. */
export function entropyToMnemonic(entropy: Uint8Array): string[] {
  if (entropy.length !== ENTROPY_BYTES) {
    throw new RangeError(`entropy must be ${ENTROPY_BYTES} bytes, got ${entropy.length}`);
  }
  return Array.from(entropy, (b) => WORD_LIST[b] as string);
}

/**
 * Decode 16 mnemonic words back to 16 bytes of entropy.
 * Returns null if any word is not in the list.
 */
export function mnemonicToEntropy(words: string[]): Uint8Array | null {
  if (words.length !== MNEMONIC_WORDS) return null;
  const entropy = new Uint8Array(ENTROPY_BYTES);
  for (let i = 0; i < MNEMONIC_WORDS; i++) {
    const idx = wordIndex(words[i] ?? "");
    if (idx < 0) return null;
    entropy[i] = idx;
  }
  return entropy;
}

/** Generate 16 bytes of random entropy using the platform CSPRNG. */
export function generateEntropy(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(ENTROPY_BYTES));
}
