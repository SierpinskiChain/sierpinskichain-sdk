/**
 * TriWallet connector — popup-based dApp wallet integration.
 *
 * Opens TriWallet as a popup, communicates via postMessage protocol.
 * Framework-agnostic. For React bindings, see ./triwallet-react.tsx.
 */
export type DappMethod = "spc_requestAccounts" | "spc_sendTransaction" | "spc_signMessage" | "spc_signTypedData" | "spc_hasSbt" | "spc_getBalance" | "spc_resolveName" | "spc_createDid";
export interface DappRequest {
    id: string;
    method: DappMethod;
    params: unknown[];
    origin: string;
}
export interface DappResponse {
    id: string;
    result?: unknown;
    error?: {
        code: number;
        message: string;
    };
}
export interface TxParams {
    from: string;
    to: string;
    amount: string;
    token?: string;
    memo?: string;
    finalityLevel?: number;
}
export interface ProviderConfig {
    walletUrl?: string;
}
export declare const TRIWALLET_URL = "https://triwallet.sierpinskichain.com";
export declare function listenForWalletResponses(): void;
export declare function connectToTriWallet(triWalletUrl: string, method: DappMethod, params?: unknown[], origin?: string): Promise<unknown>;
export declare function connectTriWallet(walletUrl?: string): Promise<string[]>;
export declare function signMessageWithTriWallet(message: string, walletUrl?: string): Promise<string>;
export declare function sendTransactionViaTriWallet(params: TxParams, walletUrl?: string): Promise<string>;
export declare class TriWalletProvider {
    private walletUrl;
    private connectedAccounts;
    private started;
    constructor(config?: ProviderConfig);
    init(): void;
    requestAccounts(): Promise<string[]>;
    signMessage(message: string): Promise<string>;
    sendTransaction(params: TxParams): Promise<string>;
    signTypedData(data: unknown): Promise<string>;
    hasSbt(address: string, tokenType: string): Promise<boolean>;
    resolveSpName(name: string): Promise<string>;
    createDid(address: string): Promise<string>;
    get accounts(): string[];
}
//# sourceMappingURL=triwallet.d.ts.map