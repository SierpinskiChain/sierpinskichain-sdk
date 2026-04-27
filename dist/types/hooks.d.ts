import type { SierpinskiClient } from "./client.js";
import type { Block, Transaction } from "./types.js";
export interface UseBalanceResult {
    balance: bigint | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}
/**
 * Fetch and auto-refresh the balance for a `.sp` address.
 * @param client  SierpinskiClient instance
 * @param address `.sp` address to query, or null to skip
 * @param refreshMs Auto-refresh interval in ms (default: 0 = no auto-refresh)
 */
export declare function useBalance(client: SierpinskiClient, address: string | null, refreshMs?: number): UseBalanceResult;
export interface UseBlockResult {
    block: Block | null;
    loading: boolean;
    error: Error | null;
}
/**
 * Fetch a block by height. Pass `"latest"` to fetch the latest block.
 */
export declare function useBlock(client: SierpinskiClient, height: number | "latest"): UseBlockResult;
export interface UseTxResult {
    tx: Transaction | null;
    loading: boolean;
    error: Error | null;
}
/**
 * Fetch a transaction by hash. Pass `null` to skip.
 */
export declare function useTx(client: SierpinskiClient, txHash: string | null): UseTxResult;
//# sourceMappingURL=hooks.d.ts.map