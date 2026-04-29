"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HdWallet = void 0;
/**
 * HdWallet — high-level wallet class.
 *
 * Mirrors the Zig HdWallet API; all key derivation is deterministic.
 * Mnemonics and addresses are byte-for-byte compatible with the Zig wallet.
 */
const wallet_slip0010_js_1 = require("./wallet-slip0010.js");
const wallet_mnemonic_js_1 = require("./wallet-mnemonic.js");
const wallet_wordlist_js_1 = require("./wallet-wordlist.js");
const wallet_transaction_js_1 = require("./wallet-transaction.js");
const MAX_ACCOUNTS = 64;
class HdWallet {
    #entropy;
    #keys = new Map();
    #nonce = 0n;
    constructor(entropy) {
        this.#entropy = entropy;
    }
    // ── Factories ───────────────────────────────────────────────────────────────
    /** Create a new random wallet. */
    static generate() {
        return new HdWallet((0, wallet_mnemonic_js_1.generateEntropy)());
    }
    /** Restore a wallet from a 16-word mnemonic. Returns null if any word is invalid. */
    static fromMnemonic(words) {
        const entropy = (0, wallet_mnemonic_js_1.mnemonicToEntropy)(words);
        if (!entropy)
            return null;
        return new HdWallet(entropy);
    }
    /** Create a wallet from raw 16-byte entropy. */
    static fromEntropy(entropy) {
        if (entropy.length !== 16)
            throw new RangeError("entropy must be 16 bytes");
        return new HdWallet(new Uint8Array(entropy));
    }
    // ── Mnemonic ─────────────────────────────────────────────────────────────────
    /** Return the 16-word mnemonic for this wallet. */
    get mnemonicWords() {
        return (0, wallet_mnemonic_js_1.entropyToMnemonic)(this.#entropy);
    }
    /** Return the mnemonic as a space-separated string. */
    get mnemonic() {
        return this.mnemonicWords.join(" ");
    }
    // ── Key/address derivation ────────────────────────────────────────────────
    /** Derive (and cache) the HD key for account `index`. */
    deriveAccount(index) {
        if (index >= MAX_ACCOUNTS)
            throw new RangeError(`index ${index} exceeds MAX_ACCOUNTS`);
        if (this.#keys.has(index))
            return this.#keys.get(index);
        const seed = (0, wallet_slip0010_js_1.seedFromEntropy)(this.#entropy);
        const key = (0, wallet_slip0010_js_1.derivePath)(seed, index);
        this.#keys.set(index, key);
        return key;
    }
    /** Return the .sp address for account `index`. */
    address(index) {
        return (0, wallet_slip0010_js_1.toAddress)(this.deriveAccount(index));
    }
    /** Return the hex-encoded public key for account `index`. */
    publicKey(index) {
        const pub = (0, wallet_slip0010_js_1.toPublicKeyBytes)(this.deriveAccount(index));
        return Array.from(pub, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    // ── Signing ──────────────────────────────────────────────────────────────────
    /**
     * Sign a transfer from account `fromIndex` to `toAddress`.
     * Returns a SignedTx ready to submit to `SierpinskiClient.sendTransaction()`.
     */
    sign(fromIndex, to, amount) {
        const key = this.deriveAccount(fromIndex);
        const from = (0, wallet_slip0010_js_1.toAddress)(key);
        this.#nonce++;
        return (0, wallet_transaction_js_1.signTransaction)(key, from, to, amount, this.#nonce);
    }
    // ── Estimation ─────────────────────────────────────────────────────────────
    /**
     * Estimate fee for a transfer (placeholder — returns a fixed fee until
     * the node exposes fee estimation via RPC).
     */
    estimateFee(_amount) {
        return 1000n; // 1000 micro-SPC minimum fee
    }
    // ── Serialization ─────────────────────────────────────────────────────────
    /** Export mnemonic as newline-terminated space-separated words (wallet file format). */
    toFileString() {
        return this.mnemonicWords.join(" ") + "\n";
    }
    /** Parse a wallet file string back into an HdWallet. */
    static fromFileString(content) {
        const words = content.trim().split(/\s+/);
        if (words.length !== wallet_wordlist_js_1.MNEMONIC_WORDS)
            return null;
        return HdWallet.fromMnemonic(words);
    }
}
exports.HdWallet = HdWallet;
//# sourceMappingURL=wallet-core.js.map