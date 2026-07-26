"use strict";
/**
 * TriWallet connector — popup-based dApp wallet integration.
 *
 * Opens TriWallet as a popup, communicates via postMessage protocol.
 * Framework-agnostic. For React bindings, see ./triwallet-react.tsx.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriWalletProvider = exports.TRIWALLET_URL = void 0;
exports.listenForWalletResponses = listenForWalletResponses;
exports.connectToTriWallet = connectToTriWallet;
exports.connectTriWallet = connectTriWallet;
exports.signMessageWithTriWallet = signMessageWithTriWallet;
exports.sendTransactionViaTriWallet = sendTransactionViaTriWallet;
// ── Constants ───────────────────────────────────────────────────────────────
exports.TRIWALLET_URL = "https://triwallet.sierpinskichain.com";
const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 680;
const REQUEST_TIMEOUT_MS = 300_000;
const RESPONSE_TYPE = "SPC_RESPONSE";
// ── Pending request registry ────────────────────────────────────────────────
let requestCounter = 0;
const pendingRequests = new Map();
// ── Message listener ────────────────────────────────────────────────────────
function drainSessionStorage() {
    if (typeof window === "undefined")
        return;
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key?.startsWith("spc_response_"))
            continue;
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw)
                continue;
            const response = JSON.parse(raw);
            const pending = pendingRequests.get(response.id);
            if (pending) {
                pendingRequests.delete(response.id);
                sessionStorage.removeItem(key);
                if (response.error) {
                    pending.reject(new Error(response.error.message ?? "Request rejected"));
                }
                else {
                    pending.resolve(response.result);
                }
            }
        }
        catch { /* skip */ }
    }
}
function listenForWalletResponses() {
    if (typeof window === "undefined")
        return;
    const handler = (event) => {
        if (event.data?.type === RESPONSE_TYPE) {
            const { id, result, error } = event.data;
            const pending = pendingRequests.get(id);
            if (pending) {
                pendingRequests.delete(id);
                if (error) {
                    pending.reject(new Error(error.message ?? "Request rejected"));
                }
                else {
                    pending.resolve(result);
                }
            }
        }
    };
    window.addEventListener("message", handler);
    drainSessionStorage();
}
// ── Core connection ─────────────────────────────────────────────────────────
function connectToTriWallet(triWalletUrl, method, params = [], origin) {
    const dappOrigin = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
    return new Promise((resolve, reject) => {
        const id = `spc_${++requestCounter}_${Date.now()}`;
        const request = { id, method, params, origin: dappOrigin };
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
        const popup = window.open(url, "TriWallet", `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},popup=1`);
        if (!popup) {
            pendingRequests.delete(id);
            clearTimeout(timer);
            reject(new Error("Popup blocked. Please allow popups to connect your wallet."));
        }
    });
}
// ── Convenience helpers ─────────────────────────────────────────────────────
function connectTriWallet(walletUrl = exports.TRIWALLET_URL) {
    return connectToTriWallet(walletUrl, "spc_requestAccounts");
}
function signMessageWithTriWallet(message, walletUrl = exports.TRIWALLET_URL) {
    return connectToTriWallet(walletUrl, "spc_signMessage", [message]);
}
function sendTransactionViaTriWallet(params, walletUrl = exports.TRIWALLET_URL) {
    return connectToTriWallet(walletUrl, "spc_sendTransaction", [params]);
}
// ── Provider class ──────────────────────────────────────────────────────────
class TriWalletProvider {
    walletUrl;
    connectedAccounts = [];
    started = false;
    constructor(config = {}) {
        this.walletUrl = config.walletUrl ?? exports.TRIWALLET_URL;
    }
    init() {
        if (this.started)
            return;
        listenForWalletResponses();
        this.started = true;
    }
    async requestAccounts() {
        const accounts = (await connectToTriWallet(this.walletUrl, "spc_requestAccounts"));
        this.connectedAccounts = accounts;
        return accounts;
    }
    async signMessage(message) {
        return connectToTriWallet(this.walletUrl, "spc_signMessage", [message]);
    }
    async sendTransaction(params) {
        return connectToTriWallet(this.walletUrl, "spc_sendTransaction", [params]);
    }
    async signTypedData(data) {
        return connectToTriWallet(this.walletUrl, "spc_signTypedData", [data]);
    }
    async hasSbt(address, tokenType) {
        return connectToTriWallet(this.walletUrl, "spc_hasSbt", [address, tokenType]);
    }
    async resolveSpName(name) {
        return connectToTriWallet(this.walletUrl, "spc_resolveName", [name]);
    }
    async createDid(address) {
        return connectToTriWallet(this.walletUrl, "spc_createDid", [address]);
    }
    get accounts() {
        return this.connectedAccounts;
    }
}
exports.TriWalletProvider = TriWalletProvider;
//# sourceMappingURL=triwallet.js.map