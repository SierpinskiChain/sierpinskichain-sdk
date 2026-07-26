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

import {
  useCallback,
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  listenForWalletResponses,
  connectTriWallet,
} from "./triwallet.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TriWalletState {
  accounts: string[];
  isConnecting: boolean;
  error: string | null;
  connect: (walletUrl?: string) => Promise<string[]>;
  disconnect: () => void;
}

// ── Context (optional, for app-wide state sharing) ──────────────────────────

interface TriWalletContextValue extends TriWalletState {
  ready: boolean;
}

const TriWalletContext = createContext<TriWalletContextValue | null>(null);

export interface TriWalletProviderProps {
  children: ReactNode;
}

export function TriWalletProvider({ children }: TriWalletProviderProps) {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (walletUrl?: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const result = await connectTriWallet(walletUrl);
      setAccounts(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccounts([]);
    setError(null);
  }, []);

  return (
    <TriWalletContext.Provider
      value={{ accounts, isConnecting, error, connect, disconnect, ready: true }}
    >
      {children}
    </TriWalletContext.Provider>
  );
}

export function useTriWalletContext(): TriWalletContextValue {
  const ctx = useContext(TriWalletContext);
  if (!ctx) throw new Error("useTriWalletContext must be used within <TriWalletProvider>");
  return ctx;
}

// ── Standalone hook ──────────────────────────────────────────────────────────

export function useTriWallet(): TriWalletState {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (walletUrl?: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const result = await connectTriWallet(walletUrl);
      setAccounts(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      throw err;
    } finally {
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

export function TriWalletListener(): null {
  useEffect(() => {
    listenForWalletResponses();
  }, []);
  return null;
}
