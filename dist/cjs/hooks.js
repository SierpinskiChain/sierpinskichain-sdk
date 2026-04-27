"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBalance = useBalance;
exports.useBlock = useBlock;
exports.useTx = useTx;
/**
 * React hooks for the Sierpinski SDK.
 * Optional — only import if React is a peer dependency in the consuming app.
 *
 * Usage:
 *   import { SierpinskiClient } from "@sierpinskichain/sdk";
 *   import { useBalance, useBlock, useTx } from "@sierpinskichain/sdk/hooks";
 */
const react_1 = require("react");
/**
 * Fetch and auto-refresh the balance for a `.sp` address.
 * @param client  SierpinskiClient instance
 * @param address `.sp` address to query, or null to skip
 * @param refreshMs Auto-refresh interval in ms (default: 0 = no auto-refresh)
 */
function useBalance(client, address, refreshMs = 0) {
    const [balance, setBalance] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchRef = (0, react_1.useRef)(0);
    const fetch = (0, react_1.useCallback)(() => {
        if (!address)
            return;
        const id = ++fetchRef.current;
        setLoading(true);
        setError(null);
        client
            .getBalance(address)
            .then((b) => {
            if (fetchRef.current === id)
                setBalance(b);
        })
            .catch((e) => {
            if (fetchRef.current === id)
                setError(e instanceof Error ? e : new Error(String(e)));
        })
            .finally(() => {
            if (fetchRef.current === id)
                setLoading(false);
        });
    }, [client, address]);
    (0, react_1.useEffect)(() => {
        fetch();
        if (refreshMs > 0) {
            const t = setInterval(fetch, refreshMs);
            return () => clearInterval(t);
        }
        return undefined;
    }, [fetch, refreshMs]);
    return { balance, loading, error, refetch: fetch };
}
/**
 * Fetch a block by height. Pass `"latest"` to fetch the latest block.
 */
function useBlock(client, height) {
    const [block, setBlock] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        setLoading(true);
        setError(null);
        const p = height === "latest"
            ? client.getLatestBlock()
            : client.getBlock(height);
        p.then(setBlock)
            .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
            .finally(() => setLoading(false));
    }, [client, height]);
    return { block, loading, error };
}
/**
 * Fetch a transaction by hash. Pass `null` to skip.
 */
function useTx(client, txHash) {
    const [tx, setTx] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!txHash)
            return;
        setLoading(true);
        setError(null);
        client
            .getTransaction(txHash)
            .then(setTx)
            .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
            .finally(() => setLoading(false));
    }, [client, txHash]);
    return { tx, loading, error };
}
//# sourceMappingURL=hooks.js.map