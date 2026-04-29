/**
 * HdWallet — high-level wallet class.
 *
 * Mirrors the Zig HdWallet API; all key derivation is deterministic.
 * Mnemonics and addresses are byte-for-byte compatible with the Zig wallet.
 */
import { derivePath, toAddress, toPublicKeyBytes, seedFromEntropy } from "./wallet-slip0010.js";
import type { HdKey } from "./wallet-slip0010.js";
import { entropyToMnemonic, mnemonicToEntropy, generateEntropy } from "./wallet-mnemonic.js";
import { MNEMONIC_WORDS } from "./wallet-wordlist.js";
import { signTransaction } from "./wallet-transaction.js";
import type { SignedTx } from "./wallet-transaction.js";

const MAX_ACCOUNTS = 64;

export class HdWallet {
  readonly #entropy: Uint8Array;
  readonly #keys: Map<number, HdKey> = new Map();
  #nonce = 0n;

  private constructor(entropy: Uint8Array) {
    this.#entropy = entropy;
  }

  // ── Factories ───────────────────────────────────────────────────────────────

  /** Create a new random wallet. */
  static generate(): HdWallet {
    return new HdWallet(generateEntropy());
  }

  /** Restore a wallet from a 16-word mnemonic. Returns null if any word is invalid. */
  static fromMnemonic(words: string[]): HdWallet | null {
    const entropy = mnemonicToEntropy(words);
    if (!entropy) return null;
    return new HdWallet(entropy);
  }

  /** Create a wallet from raw 16-byte entropy. */
  static fromEntropy(entropy: Uint8Array): HdWallet {
    if (entropy.length !== 16) throw new RangeError("entropy must be 16 bytes");
    return new HdWallet(new Uint8Array(entropy));
  }

  // ── Mnemonic ─────────────────────────────────────────────────────────────────

  /** Return the 16-word mnemonic for this wallet. */
  get mnemonicWords(): string[] {
    return entropyToMnemonic(this.#entropy);
  }

  /** Return the mnemonic as a space-separated string. */
  get mnemonic(): string {
    return this.mnemonicWords.join(" ");
  }

  // ── Key/address derivation ────────────────────────────────────────────────

  /** Derive (and cache) the HD key for account `index`. */
  deriveAccount(index: number): HdKey {
    if (index >= MAX_ACCOUNTS) throw new RangeError(`index ${index} exceeds MAX_ACCOUNTS`);
    if (this.#keys.has(index)) return this.#keys.get(index)!;
    const seed = seedFromEntropy(this.#entropy);
    const key  = derivePath(seed, index);
    this.#keys.set(index, key);
    return key;
  }

  /** Return the .sp address for account `index`. */
  address(index: number): string {
    return toAddress(this.deriveAccount(index));
  }

  /** Return the hex-encoded public key for account `index`. */
  publicKey(index: number): string {
    const pub = toPublicKeyBytes(this.deriveAccount(index));
    return Array.from(pub, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ── Signing ──────────────────────────────────────────────────────────────────

  /**
   * Sign a transfer from account `fromIndex` to `toAddress`.
   * Returns a SignedTx ready to submit to `SierpinskiClient.sendTransaction()`.
   */
  sign(fromIndex: number, to: string, amount: bigint): SignedTx {
    const key  = this.deriveAccount(fromIndex);
    const from = toAddress(key);
    this.#nonce++;
    return signTransaction(key, from, to, amount, this.#nonce);
  }

  // ── Estimation ─────────────────────────────────────────────────────────────

  /**
   * Estimate fee for a transfer (placeholder — returns a fixed fee until
   * the node exposes fee estimation via RPC).
   */
  estimateFee(_amount: bigint): bigint {
    return 1000n; // 1000 micro-SPC minimum fee
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  /** Export mnemonic as newline-terminated space-separated words (wallet file format). */
  toFileString(): string {
    return this.mnemonicWords.join(" ") + "\n";
  }

  /** Parse a wallet file string back into an HdWallet. */
  static fromFileString(content: string): HdWallet | null {
    const words = content.trim().split(/\s+/);
    if (words.length !== MNEMONIC_WORDS) return null;
    return HdWallet.fromMnemonic(words);
  }
}
