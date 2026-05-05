export class SierpinskiClient {
    #cfg;
    #rpcId = 0;
    // WS state
    #ws = null;
    #wsReady = false;
    #wsHandlers = new Map();
    #wsReconnectTimer = null;
    #wsConnecting = false;
    #escrowWs = null;
    #escrowHandlers = new Set();
    constructor(config) {
        const nodeUrl = config.nodeUrl.replace(/\/$/, "");
        this.#cfg = {
            nodeUrl,
            authToken: config.authToken ?? "",
            timeoutMs: config.timeoutMs ?? 10_000,
            wsUrl: config.wsUrl ?? nodeUrl.replace(/^http/, "ws") + "/ws",
            reconnectIntervalMs: config.reconnectIntervalMs ?? 3_000,
        };
    }
    // ── HTTP RPC ─────────────────────────────────────────────────────────────
    async #rpc(method, params) {
        const body = {
            jsonrpc: "2.0",
            method,
            params,
            id: ++this.#rpcId,
        };
        const headers = {
            "Content-Type": "application/json",
        };
        if (this.#cfg.authToken) {
            headers["Authorization"] = `Bearer ${this.#cfg.authToken}`;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.#cfg.timeoutMs);
        let res;
        try {
            res = await fetch(`${this.#cfg.nodeUrl}/rpc`, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        }
        finally {
            clearTimeout(timer);
        }
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} from node`);
        }
        const json = (await res.json());
        if (json.error) {
            throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
        }
        return json.result;
    }
    // ── Public API ───────────────────────────────────────────────────────────
    /** Fetch node metadata (version, height, peers, sync status). */
    getNodeInfo() {
        return this.#rpc("getNodeInfo", { caller_principal: 0 });
    }
    /** Fetch block by height. */
    getBlock(height) {
        return this.#rpc("getBlock", { height, caller_principal: 0 });
    }
    /** Fetch the latest block. */
    getLatestBlock() {
        return this.#rpc("getLatestBlock", { caller_principal: 0 });
    }
    /** Fetch transaction by hash. */
    getTransaction(txHash) {
        return this.#rpc("getTransaction", {
            txHash,
            caller_principal: 0,
        });
    }
    /** Get balance for a .sp address. Returns micro-SPC as bigint. */
    async getBalance(address) {
        const raw = await this.#rpc("getBalance", { address, caller_principal: 0 });
        return parseBalance(raw);
    }
    /** Get full balance result including address echo. */
    async getBalanceFull(address) {
        const raw = await this.#rpc("getBalance", { address, caller_principal: 0 });
        return {
            address: typeof raw.address === "string" ? raw.address : address,
            balance: parseBalance(raw),
        };
    }
    /** Broadcast a signed transaction. */
    async sendTransaction(tx) {
        return this.#rpc("sendTransaction", {
            from: tx.from,
            to: tx.to,
            amount: tx.amount.toString(),
            nonce: tx.nonce.toString(),
            signature: tx.signature,
            pubkey: tx.pubkey,
        });
    }
    /** Generic JSON-RPC call for SDK extension packages. */
    rpc(method, params) {
        return this.#rpc(method, withDefaultCallerPrincipal(params));
    }
    // ── Escrow RPC wrappers ────────────────────────────────────────────────
    async createEscrow(params) {
        const raw = await this.#rpc("createEscrow", {
            escrow_id: params.escrow_id !== undefined
                ? toWireInteger(params.escrow_id, "escrow_id")
                : undefined,
            mode: params.mode,
            buyer: toWireActor(params.buyer),
            seller: toWireActor(params.seller),
            arbiter: params.arbiter !== undefined ? toWireActor(params.arbiter) : undefined,
            amount: toWireInteger(params.amount, "amount"),
            auto_refund_at: params.auto_refund_at !== undefined
                ? toWireInteger(params.auto_refund_at, "auto_refund_at")
                : undefined,
            caller_principal: 0,
        });
        return mapEscrowMutationResult(raw);
    }
    async fundEscrow(params) {
        const raw = await this.#rpc("fundEscrow", {
            escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
            actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
            caller_principal: 0,
        });
        return mapEscrowMutationResult(raw);
    }
    async releaseEscrow(params) {
        const raw = await this.#rpc("releaseEscrow", {
            escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
            actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
            caller_principal: 0,
        });
        return mapEscrowMutationResult(raw);
    }
    async refundEscrow(params) {
        const raw = await this.#rpc("refundEscrow", {
            escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
            actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
            caller_principal: 0,
        });
        return mapEscrowMutationResult(raw);
    }
    async disputeEscrow(params) {
        const raw = await this.#rpc("disputeEscrow", {
            escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
            actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
            caller_principal: 0,
        });
        return mapEscrowMutationResult(raw);
    }
    async resolveDispute(params) {
        const raw = await this.#rpc("resolveDispute", {
            escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
            actor: toWireActor(params.actor),
            outcome: params.outcome,
            caller_principal: 0,
        });
        return mapEscrowMutationResult(raw);
    }
    async getEscrow(params) {
        const raw = await this.#rpc("getEscrow", {
            escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
            now: params.now !== undefined ? toWireInteger(params.now, "now") : undefined,
            caller_principal: 0,
        });
        return mapEscrowRecord(raw);
    }
    subscribeEscrowEvents(filter, handler) {
        const entry = { filter, handler };
        this.#escrowHandlers.add(entry);
        this.#ensureEscrowWs();
        return () => {
            this.#escrowHandlers.delete(entry);
            if (this.#escrowHandlers.size === 0) {
                this.#escrowWs?.close();
                this.#escrowWs = null;
            }
        };
    }
    // ── WebSocket event stream ────────────────────────────────────────────────
    /** Subscribe to real-time node events. Returns unsubscribe function. */
    subscribe(topic, handler) {
        let handlers = this.#wsHandlers.get(topic);
        if (!handlers) {
            handlers = new Set();
            this.#wsHandlers.set(topic, handlers);
        }
        handlers.add(handler);
        // Ensure connection is open
        this.#ensureWs();
        return () => {
            handlers?.delete(handler);
        };
    }
    #ensureWs() {
        if (this.#ws !== null || this.#wsConnecting)
            return;
        this.#connectWs();
    }
    #connectWs() {
        this.#wsConnecting = true;
        try {
            const ws = new WebSocket(this.#cfg.wsUrl);
            ws.onopen = () => {
                this.#ws = ws;
                this.#wsReady = true;
                this.#wsConnecting = false;
                // Send subscriptions for each topic we have handlers for
                for (const topic of this.#wsHandlers.keys()) {
                    ws.send(JSON.stringify({ type: "subscribe", topic }));
                }
            };
            ws.onmessage = (ev) => {
                try {
                    const event = JSON.parse(ev.data);
                    const topic = event.type === "block" ? "blocks" : "transactions";
                    const handlers = this.#wsHandlers.get(topic);
                    if (handlers) {
                        for (const h of handlers)
                            h(event);
                    }
                }
                catch {
                    // malformed frame — ignore
                }
            };
            ws.onclose = () => {
                this.#ws = null;
                this.#wsReady = false;
                this.#wsConnecting = false;
                this.#scheduleReconnect();
            };
            ws.onerror = () => {
                ws.close();
            };
        }
        catch {
            this.#wsConnecting = false;
            this.#scheduleReconnect();
        }
    }
    #scheduleReconnect() {
        if (this.#wsHandlers.size === 0)
            return; // no subscribers — don't reconnect
        if (this.#wsReconnectTimer !== null)
            return;
        this.#wsReconnectTimer = setTimeout(() => {
            this.#wsReconnectTimer = null;
            if (this.#wsHandlers.size > 0) {
                this.#connectWs();
            }
        }, this.#cfg.reconnectIntervalMs);
    }
    /** Disconnect WebSocket and cancel reconnect timer. */
    disconnect() {
        if (this.#wsReconnectTimer !== null) {
            clearTimeout(this.#wsReconnectTimer);
            this.#wsReconnectTimer = null;
        }
        this.#ws?.close();
        this.#ws = null;
        this.#wsReady = false;
        this.#wsConnecting = false;
        this.#escrowWs?.close();
        this.#escrowWs = null;
        this.#escrowHandlers.clear();
    }
    get wsConnected() {
        return this.#wsReady;
    }
    #ensureEscrowWs() {
        if (this.#escrowWs || this.#escrowHandlers.size === 0)
            return;
        const ws = new WebSocket(this.#cfg.wsUrl);
        this.#escrowWs = ws;
        ws.onopen = () => {
            ws.send(JSON.stringify({ action: "subscribe", topic: "escrow_events" }));
        };
        ws.onmessage = (ev) => {
            try {
                const parsed = JSON.parse(String(ev.data));
                const eventName = typeof parsed.event === "string" ? parsed.event : "";
                if (eventName !== "escrow_event")
                    return;
                const data = parsed.data;
                if (!data)
                    return;
                const event = {
                    action: String(data.action ?? ""),
                    escrow_id: toBigInt(data.escrow_id),
                    status: String(data.status ?? "created"),
                    buyer: toBigInt(data.buyer),
                    seller: toBigInt(data.seller),
                    amount: toBigInt(data.amount),
                    timestamp: toBigInt(data.timestamp),
                    raw: parsed,
                };
                for (const entry of this.#escrowHandlers) {
                    if (!matchesEscrowFilter(event, entry.filter))
                        continue;
                    entry.handler(event);
                }
            }
            catch {
                // ignore malformed payload
            }
        };
        ws.onclose = () => {
            this.#escrowWs = null;
            if (this.#escrowHandlers.size > 0) {
                setTimeout(() => this.#ensureEscrowWs(), this.#cfg.reconnectIntervalMs);
            }
        };
    }
}
function toWireActor(value) {
    return typeof value === "bigint" ? value.toString() : value;
}
function withDefaultCallerPrincipal(params) {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
        return params;
    }
    const record = params;
    if ("caller_principal" in record)
        return params;
    return {
        ...record,
        caller_principal: 0,
    };
}
function toWireInteger(value, field) {
    if (value < 0n) {
        throw new Error(`${field} must be non-negative`);
    }
    const out = Number(value);
    if (!Number.isSafeInteger(out)) {
        throw new Error(`${field} exceeds JSON safe integer range`);
    }
    return out;
}
function toBigInt(value) {
    if (typeof value === "bigint")
        return value;
    if (typeof value === "number")
        return BigInt(Math.trunc(value));
    if (typeof value === "string")
        return BigInt(value);
    return 0n;
}
function toBoolean(value) {
    return value === true || value === "true";
}
function parseBalance(raw) {
    const candidates = [
        raw.balance,
        raw.balance_uspc,
        raw.uspc,
        raw.amount,
    ];
    for (const candidate of candidates) {
        if (candidate === undefined || candidate === null)
            continue;
        if (typeof candidate === "bigint")
            return candidate;
        if (typeof candidate === "number")
            return BigInt(Math.trunc(candidate));
        if (typeof candidate === "string") {
            const trimmed = candidate.trim();
            if (trimmed.length > 0)
                return BigInt(trimmed);
            continue;
        }
        if (typeof candidate === "object") {
            const value = candidate.value;
            if (typeof value === "bigint")
                return value;
            if (typeof value === "number")
                return BigInt(Math.trunc(value));
            if (typeof value === "string" && value.trim().length > 0) {
                return BigInt(value.trim());
            }
        }
    }
    return 0n;
}
function mapEscrowMutationResult(raw) {
    const out = {
        accepted: toBoolean(raw.accepted),
        escrow_id: toBigInt(raw.escrow_id),
        status: String(raw.status ?? "created"),
    };
    if (raw.settled !== undefined)
        out.settled = toBoolean(raw.settled);
    if (raw.outcome !== undefined) {
        out.outcome = String(raw.outcome);
    }
    return out;
}
function mapEscrowRecord(raw) {
    return {
        accepted: toBoolean(raw.accepted),
        escrow_id: toBigInt(raw.escrow_id),
        mode: String(raw.mode ?? "2of2"),
        status: String(raw.status ?? "created"),
        buyer: toBigInt(raw.buyer),
        seller: toBigInt(raw.seller),
        arbiter: toBigInt(raw.arbiter),
        amount: toBigInt(raw.amount),
        created_at: toBigInt(raw.created_at),
        auto_refund_at: toBigInt(raw.auto_refund_at),
        funded_at: toBigInt(raw.funded_at),
        closed_at: toBigInt(raw.closed_at),
        settlement: String(raw.settlement ?? "none"),
    };
}
function matchesEscrowFilter(event, filter) {
    if (filter.action && filter.action !== event.action)
        return false;
    if (filter.escrowId !== undefined && filter.escrowId !== event.escrow_id)
        return false;
    if (filter.status && filter.status !== event.status)
        return false;
    return true;
}
//# sourceMappingURL=client.js.map