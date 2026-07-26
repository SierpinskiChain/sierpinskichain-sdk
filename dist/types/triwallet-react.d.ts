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
import { type ReactNode } from "react";
export interface TriWalletState {
    accounts: string[];
    isConnecting: boolean;
    error: string | null;
    connect: (walletUrl?: string) => Promise<string[]>;
    disconnect: () => void;
}
interface TriWalletContextValue extends TriWalletState {
    ready: boolean;
}
export interface TriWalletProviderProps {
    children: ReactNode;
}
export declare function TriWalletProvider({ children }: TriWalletProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useTriWalletContext(): TriWalletContextValue;
export declare function useTriWallet(): TriWalletState;
export declare function TriWalletListener(): null;
export {};
//# sourceMappingURL=triwallet-react.d.ts.map