/**
 * TriWallet React bindings — hooks and components for dApp integration.
 *
 * Usage:
 *   import { TriWalletListener } from "@sierpinskichain/sdk/triwallet-react";
 *   <TriWalletListener />
 *
 *   import { useTriWallet } from "@sierpinskichain/sdk/triwallet-react";
 *   const { connect, accounts, isConnecting, error } = useTriWallet();
 */
"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useState, createContext, useContext, } from "react";
import { listenForWalletResponses, connectTriWallet, } from "./triwallet.js";
const TriWalletContext = createContext(null);
export function TriWalletProvider({ children }) {
    const [accounts, setAccounts] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const connect = useCallback(async (walletUrl) => {
        setIsConnecting(true);
        setError(null);
        try {
            const result = await connectTriWallet(walletUrl);
            setAccounts(result);
            return result;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Connection failed";
            setError(msg);
            throw err;
        }
        finally {
            setIsConnecting(false);
        }
    }, []);
    const disconnect = useCallback(() => {
        setAccounts([]);
        setError(null);
    }, []);
    return (_jsx(TriWalletContext.Provider, { value: { accounts, isConnecting, error, connect, disconnect, ready: true }, children: children }));
}
export function useTriWalletContext() {
    const ctx = useContext(TriWalletContext);
    if (!ctx)
        throw new Error("useTriWalletContext must be used within <TriWalletProvider>");
    return ctx;
}
// ── Standalone hook ──────────────────────────────────────────────────────────
export function useTriWallet() {
    const [accounts, setAccounts] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const connect = useCallback(async (walletUrl) => {
        setIsConnecting(true);
        setError(null);
        try {
            const result = await connectTriWallet(walletUrl);
            setAccounts(result);
            return result;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Connection failed";
            setError(msg);
            throw err;
        }
        finally {
            setIsConnecting(false);
        }
    }, []);
    const disconnect = useCallback(() => {
        setAccounts([]);
        setError(null);
    }, []);
    return { accounts, isConnecting, error, connect, disconnect };
}
// ── Listener component ───────────────────────────────────────────────────────
export function TriWalletListener() {
    useEffect(() => {
        listenForWalletResponses();
    }, []);
    return null;
}
//# sourceMappingURL=triwallet-react.js.map