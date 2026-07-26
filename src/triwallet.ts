/**
 * TriWallet connector — popup-based dApp wallet integration.
 *
 * Opens TriWallet as a popup, communicates via postMessage protocol.
 * Framework-agnostic. For React bindings, see ./triwallet-react.tsx.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type DappMethod =
  | "spc_requestAccounts"
  | "spc_sendTransaction"
  | "spc_signMessage"
  | "spc_signTypedData"
  | "spc_hasSbt"
  | "spc_getBalance"
  | "spc_resolveName"
  | "spc_createDid";

export interface DappRequest {
  id: string;
  method: DappMethod;
  params: unknown[];
  origin: string;
}

export interface DappResponse {
  id: string;
  result?: unknown;
  error?: { code: number; message: string };
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

// ── Constants ───────────────────────────────────────────────────────────────

export const TRIWALLET_URL = "https://triwallet.sierpinskichain.com";
const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 680;
const REQUEST_TIMEOUT_MS = 300_000;
const RESPONSE_TYPE = "SPC_RESPONSE";

// ── Pending request registry ────────────────────────────────────────────────

let requestCounter = 0;
const pendingRequests = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();

// ── Message listener ────────────────────────────────────────────────────────

function drainSessionStorage(): void {
  if (typeof window === "undefined") return;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith("spc_response_")) continue;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const response: DappResponse = JSON.parse(raw);
      const pending = pendingRequests.get(response.id);
      if (pending) {
        pendingRequests.delete(response.id);
        sessionStorage.removeItem(key);
        if (response.error) {
          pending.reject(new Error(response.error.message ?? "Request rejected"));
        } else {
          pending.resolve(response.result);
        }
      }
    } catch { /* skip */ }
  }
}

export function listenForWalletResponses(): void {
  if (typeof window === "undefined") return;
  const handler = (event: MessageEvent) => {
    if (event.data?.type === RESPONSE_TYPE) {
      const { id, result, error } = event.data as DappResponse & { type: string };
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        if (error) {
          pending.reject(new Error(error.message ?? "Request rejected"));
        } else {
          pending.resolve(result);
        }
      }
    }
  };
  window.addEventListener("message", handler);
  drainSessionStorage();
}

// ── Core connection ─────────────────────────────────────────────────────────

export function connectToTriWallet(
  triWalletUrl: string,
  method: DappMethod,
  params: unknown[] = [],
  origin?: string,
): Promise<unknown> {
  const dappOrigin =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");

  return new Promise((resolve, reject) => {
    const id = `spc_${++requestCounter}_${Date.now()}`;
    const request: DappRequest = { id, method, params, origin: dappOrigin };

    pendingRequests.set(id, { resolve, reject });

    const timer = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error("TriWallet request timed out"));
      }
    }, REQUEST_TIMEOUT_MS);

    pendingRequests.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject: (err) => { clearTimeout(timer); reject(err); },
    });

    const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2;
    const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2;
    const payload = encodeURIComponent(JSON.stringify(request));
    const url = `${triWalletUrl}/dapp/connect?spc_request=${payload}`;

    const popup = window.open(
      url, "TriWallet",
      `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},popup=1`,
    );

    if (!popup) {
      pendingRequests.delete(id);
      clearTimeout(timer);
      reject(new Error("Popup blocked. Please allow popups to connect your wallet."));
    }
  });
}

// ── Convenience helpers ─────────────────────────────────────────────────────

export function connectTriWallet(walletUrl = TRIWALLET_URL): Promise<string[]> {
  return connectToTriWallet(walletUrl, "spc_requestAccounts") as Promise<string[]>;
}

export function signMessageWithTriWallet(
  message: string,
  walletUrl = TRIWALLET_URL,
): Promise<string> {
  return connectToTriWallet(walletUrl, "spc_signMessage", [message]) as Promise<string>;
}

export function sendTransactionViaTriWallet(
  params: TxParams,
  walletUrl = TRIWALLET_URL,
): Promise<string> {
  return connectToTriWallet(walletUrl, "spc_sendTransaction", [params]) as Promise<string>;
}

// ── Provider class ──────────────────────────────────────────────────────────

export class TriWalletProvider {
  private walletUrl: string;
  private connectedAccounts: string[] = [];
  private started = false;

  constructor(config: ProviderConfig = {}) {
    this.walletUrl = config.walletUrl ?? TRIWALLET_URL;
  }

  init(): void {
    if (this.started) return;
    listenForWalletResponses();
    this.started = true;
  }

  async requestAccounts(): Promise<string[]> {
    const accounts = (await connectToTriWallet(this.walletUrl, "spc_requestAccounts")) as string[];
    this.connectedAccounts = accounts;
    return accounts;
  }

  async signMessage(message: string): Promise<string> {
    return connectToTriWallet(this.walletUrl, "spc_signMessage", [message]) as Promise<string>;
  }

  async sendTransaction(params: TxParams): Promise<string> {
    return connectToTriWallet(this.walletUrl, "spc_sendTransaction", [params]) as Promise<string>;
  }

  async signTypedData(data: unknown): Promise<string> {
    return connectToTriWallet(this.walletUrl, "spc_signTypedData", [data]) as Promise<string>;
  }

  async hasSbt(address: string, tokenType: string): Promise<boolean> {
    return connectToTriWallet(this.walletUrl, "spc_hasSbt", [address, tokenType]) as Promise<boolean>;
  }

  async resolveSpName(name: string): Promise<string> {
    return connectToTriWallet(this.walletUrl, "spc_resolveName", [name]) as Promise<string>;
  }

  async createDid(address: string): Promise<string> {
    return connectToTriWallet(this.walletUrl, "spc_createDid", [address]) as Promise<string>;
  }

  get accounts(): string[] {
    return this.connectedAccounts;
  }
}
