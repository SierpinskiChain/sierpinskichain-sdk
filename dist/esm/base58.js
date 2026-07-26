/**
 * Base58 encoding (Bitcoin alphabet).
 * Used for Sierpinski .sp addresses — both wallets and contracts.
 */
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function base58Encode(bytes) {
    let n = 0n;
    for (let i = 0; i < bytes.length; i++) {
        n = (n << 8n) | BigInt(bytes[i]);
    }
    // Count leading zeros
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0)
        zeros++;
    let result = "";
    while (n > 0n) {
        result = ALPHABET[Number(n % 58n)] + result;
        n = n / 58n;
    }
    // Pad with '1' for leading zeros
    for (let i = 0; i < zeros; i++)
        result = "1" + result;
    return result;
}
//# sourceMappingURL=base58.js.map