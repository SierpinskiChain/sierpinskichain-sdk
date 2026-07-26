"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriWalletProvider = TriWalletProvider;
exports.useTriWalletContext = useTriWalletContext;
exports.useTriWallet = useTriWallet;
exports.TriWalletListener = TriWalletListener;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const triwallet_js_1 = require("./triwallet.js");
const TriWalletContext = (0, react_1.createContext)(null);
function TriWalletProvider({ children }) {
    const [accounts, setAccounts] = (0, react_1.useState)([]);
    const [isConnecting, setIsConnecting] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const connect = (0, react_1.useCallback)(async (walletUrl) => {
        setIsConnecting(true);
        setError(null);
        try {
            const result = await (0, triwallet_js_1.connectTriWallet)(walletUrl);
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
    const disconnect = (0, react_1.useCallback)(() => {
        setAccounts([]);
        setError(null);
    }, []);
    return ((0, jsx_runtime_1.jsx)(TriWalletContext.Provider, { value: { accounts, isConnecting, error, connect, disconnect, ready: true }, children: children }));
}
function useTriWalletContext() {
    const ctx = (0, react_1.useContext)(TriWalletContext);
    if (!ctx)
        throw new Error("useTriWalletContext must be used within <TriWalletProvider>");
    return ctx;
}
// ── Standalone hook ──────────────────────────────────────────────────────────
function useTriWallet() {
    const [accounts, setAccounts] = (0, react_1.useState)([]);
    const [isConnecting, setIsConnecting] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const connect = (0, react_1.useCallback)(async (walletUrl) => {
        setIsConnecting(true);
        setError(null);
        try {
            const result = await (0, triwallet_js_1.connectTriWallet)(walletUrl);
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
    const disconnect = (0, react_1.useCallback)(() => {
        setAccounts([]);
        setError(null);
    }, []);
    return { accounts, isConnecting, error, connect, disconnect };
}
// ── Listener component ───────────────────────────────────────────────────────
function TriWalletListener() {
    (0, react_1.useEffect)(() => {
        (0, triwallet_js_1.listenForWalletResponses)();
    }, []);
    return null;
}
//# sourceMappingURL=triwallet-react.js.map