/**
 * SierpinskiClient — typed JSON-RPC HTTP client + WebSocket event stream.
 *
 * HTTP: plain fetch() for queries (Bun + Node 18+ compatible).
 * WebSocket: optional; auto-reconnects on disconnect.
 */
import type {
  SierpinskiClientConfig,
  RpcRequest,
  RpcResponse,
  NodeInfo,
  Block,
  Transaction,
  BalanceResult,
  SendTxResult,
  NodeEvent,
  EventHandler,
  UnsubscribeFn,
  SubscriptionTopic,
  CreateEscrowParams,
  EscrowActionParams,
  ResolveDisputeParams,
  GetEscrowParams,
  EscrowRecord,
  EscrowMutationResult,
  EscrowEvent,
  EscrowEventFilter,
  SignedTx,
} from "./types.js";

export class RpcResponseError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(`RPC error ${code}: ${message}`);
    this.name = "RpcResponseError";
    this.code = code;
    this.data = data;
  }
}

export class RpcHttpError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string) {
    super(`HTTP ${status} from node ${url}`);
    this.name = "RpcHttpError";
    this.status = status;
    this.url = url;
  }
}

export class RpcNetworkError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "RpcNetworkError";
    this.cause = cause;
  }
}

export class SierpinskiClient {
  readonly #cfg: Required<SierpinskiClientConfig>;
  readonly #rpcUrls: string[];
  #rpcId = 0;

  // WS state
  #ws: WebSocket | null = null;
  #wsReady = false;
  #wsHandlers = new Map<SubscriptionTopic, Set<EventHandler<NodeEvent>>>();
  #wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #wsConnecting = false;
  #escrowWs: WebSocket | null = null;
  #escrowHandlers = new Set<{ filter: EscrowEventFilter; handler: EventHandler<EscrowEvent> }>();

  constructor(config: SierpinskiClientConfig) {
    const nodeUrl = config.nodeUrl.replace(/\/$/, "");
    const fallbackNodeUrls = (config.fallbackNodeUrls ?? [])
      .map((url) => url.replace(/\/$/, ""))
      .filter((url) => url.length > 0 && url !== nodeUrl);

    this.#cfg = {
      nodeUrl,
      fallbackNodeUrls,
      authToken: config.authToken ?? "",
      timeoutMs: config.timeoutMs ?? 10_000,
      maxRetries: config.maxRetries ?? 1,
      retryDelayMs: config.retryDelayMs ?? 0,
      idempotencyKeyPrefix: config.idempotencyKeyPrefix ?? "",
      wsUrl: config.wsUrl ?? nodeUrl.replace(/^http/, "ws") + "/ws",
      reconnectIntervalMs: config.reconnectIntervalMs ?? 3_000,
    };
    this.#rpcUrls = [this.#cfg.nodeUrl, ...this.#cfg.fallbackNodeUrls];
  }

  // ── HTTP RPC ─────────────────────────────────────────────────────────────

  async #rpc<T>(method: string, params?: unknown): Promise<T> {
    const requestId = ++this.#rpcId;
    const body: RpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: requestId,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.#cfg.authToken) {
      headers["Authorization"] = `Bearer ${this.#cfg.authToken}`;
    }
    if (this.#cfg.idempotencyKeyPrefix) {
      headers["X-Idempotency-Key"] = `${this.#cfg.idempotencyKeyPrefix}:${method}:${requestId}`;
    }

    let lastRetryableError: RpcHttpError | RpcNetworkError | null = null;
    for (let round = 0; round <= this.#cfg.maxRetries; round += 1) {
      for (const rpcUrl of this.#rpcUrls) {
        const result = await this.#rpcOnce<T>(rpcUrl, body, headers);
        if (result.ok) return result.value;
        if (!result.retryable) {
          throw result.error;
        }
        lastRetryableError = result.error;
      }
      if (round < this.#cfg.maxRetries && this.#cfg.retryDelayMs > 0) {
        await sleep(this.#cfg.retryDelayMs);
      }
    }

    throw new RpcNetworkError(
      "RPC request exhausted retries and fallback endpoints",
      lastRetryableError,
    );
  }

  async #rpcOnce<T>(
    rpcUrl: string,
    body: RpcRequest,
    headers: Record<string, string>,
  ): Promise<RpcAttempt<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#cfg.timeoutMs);

    let res: globalThis.Response;
    try {
      res = await fetch(`${rpcUrl}/rpc`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      return {
        ok: false,
        retryable: true,
        error: new RpcNetworkError(`Network error while calling ${rpcUrl}`, error),
      };
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const httpError = new RpcHttpError(res.status, `${rpcUrl}/rpc`);
      return {
        ok: false,
        retryable: res.status >= 500 || res.status === 429,
        error: httpError,
      };
    }

    const json = await parseRpcResponse<T>(res);
    if (json.error) {
      return {
        ok: false,
        retryable: false,
        error: new RpcResponseError(json.error.code, json.error.message, json.error.data),
      };
    }
    return { ok: true, value: json.result as T };
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Fetch node metadata (version, height, peers, sync status). */
  getNodeInfo(): Promise<NodeInfo> {
    return this.#rpc<NodeInfo>("getNodeInfo", { caller_principal: 0 });
  }

  /** Fetch block by height. */
  getBlock(height: number): Promise<Block> {
    return this.#rpc<Block>("getBlock", { height, caller_principal: 0 });
  }

  /** Fetch the latest block. */
  getLatestBlock(): Promise<Block> {
    return this.#rpc<Block>("getLatestBlock", { caller_principal: 0 });
  }

  /** Fetch transaction by hash. */
  getTransaction(txHash: string): Promise<Transaction> {
    return this.#rpc<Transaction>("getTransaction", {
      txHash,
      caller_principal: 0,
    });
  }

  /** Get balance for a .sp address. Returns micro-SPC as bigint. */
  async getBalance(address: string): Promise<bigint> {
    const raw = await this.#rpc<Record<string, unknown>>(
      "getBalance",
      { address, caller_principal: 0 },
    );
    return parseBalance(raw);
  }

  /** Get full balance result including address echo. */
  async getBalanceFull(address: string): Promise<BalanceResult> {
    const raw = await this.#rpc<Record<string, unknown>>(
      "getBalance",
      { address, caller_principal: 0 },
    );
    return {
      address: typeof raw.address === "string" ? raw.address : address,
      balance: parseBalance(raw),
    };
  }

  /** Broadcast a signed transaction. */
  async sendTransaction(tx: SignedTx): Promise<SendTxResult> {
    return this.#rpc<SendTxResult>("sendTransaction", {
      from: tx.from,
      to: tx.to,
      amount: tx.amount.toString(),
      nonce: tx.nonce.toString(),
      signature: tx.signature,
      pubkey: tx.pubkey,
    });
  }

  /** Generic JSON-RPC call for SDK extension packages. */
  rpc<T>(method: string, params?: unknown): Promise<T> {
    return this.#rpc<T>(method, withDefaultCallerPrincipal(params));
  }

  // ── Escrow RPC wrappers ────────────────────────────────────────────────

  async createEscrow(params: CreateEscrowParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("createEscrow", {
      escrow_id:
        params.escrow_id !== undefined
          ? toWireInteger(params.escrow_id, "escrow_id")
          : undefined,
      mode: params.mode,
      buyer: toWireActor(params.buyer),
      seller: toWireActor(params.seller),
      arbiter: params.arbiter !== undefined ? toWireActor(params.arbiter) : undefined,
      amount: toWireInteger(params.amount, "amount"),
      auto_refund_at:
        params.auto_refund_at !== undefined
          ? toWireInteger(params.auto_refund_at, "auto_refund_at")
          : undefined,
      caller_principal: 0,
    });
    return mapEscrowMutationResult(raw);
  }

  async fundEscrow(params: EscrowActionParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("fundEscrow", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
      caller_principal: 0,
    });
    return mapEscrowMutationResult(raw);
  }

  async releaseEscrow(params: EscrowActionParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("releaseEscrow", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
      caller_principal: 0,
    });
    return mapEscrowMutationResult(raw);
  }

  async refundEscrow(params: EscrowActionParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("refundEscrow", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
      caller_principal: 0,
    });
    return mapEscrowMutationResult(raw);
  }

  async disputeEscrow(params: EscrowActionParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("disputeEscrow", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
      caller_principal: 0,
    });
    return mapEscrowMutationResult(raw);
  }

  async resolveDispute(params: ResolveDisputeParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("resolveDispute", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: toWireActor(params.actor),
      outcome: params.outcome,
      caller_principal: 0,
    });
    return mapEscrowMutationResult(raw);
  }

  async getEscrow(params: GetEscrowParams): Promise<EscrowRecord> {
    const raw = await this.#rpc<Record<string, unknown>>("getEscrow", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      now: params.now !== undefined ? toWireInteger(params.now, "now") : undefined,
      caller_principal: 0,
    });
    return mapEscrowRecord(raw);
  }

  subscribeEscrowEvents(
    filter: EscrowEventFilter,
    handler: EventHandler<EscrowEvent>,
  ): UnsubscribeFn {
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
  subscribe<T extends NodeEvent>(
    topic: SubscriptionTopic,
    handler: EventHandler<T>,
  ): UnsubscribeFn {
    let handlers = this.#wsHandlers.get(topic);
    if (!handlers) {
      handlers = new Set();
      this.#wsHandlers.set(topic, handlers);
    }
    handlers.add(handler as EventHandler<NodeEvent>);

    // Ensure connection is open
    this.#ensureWs();

    return () => {
      handlers?.delete(handler as EventHandler<NodeEvent>);
    };
  }

  #ensureWs(): void {
    if (this.#ws !== null || this.#wsConnecting) return;
    this.#connectWs();
  }

  #connectWs(): void {
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

      ws.onmessage = (ev: MessageEvent) => {
        try {
          const event = JSON.parse(ev.data as string) as NodeEvent;
          const topic: SubscriptionTopic =
            event.type === "block" ? "blocks" : "transactions";
          const handlers = this.#wsHandlers.get(topic);
          if (handlers) {
            for (const h of handlers) h(event);
          }
        } catch {
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
    } catch {
      this.#wsConnecting = false;
      this.#scheduleReconnect();
    }
  }

  #scheduleReconnect(): void {
    if (this.#wsHandlers.size === 0) return; // no subscribers — don't reconnect
    if (this.#wsReconnectTimer !== null) return;
    this.#wsReconnectTimer = setTimeout(() => {
      this.#wsReconnectTimer = null;
      if (this.#wsHandlers.size > 0) {
        this.#connectWs();
      }
    }, this.#cfg.reconnectIntervalMs);
  }

  /** Disconnect WebSocket and cancel reconnect timer. */
  disconnect(): void {
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

  get wsConnected(): boolean {
    return this.#wsReady;
  }

  #ensureEscrowWs(): void {
    if (this.#escrowWs || this.#escrowHandlers.size === 0) return;
    const ws = new WebSocket(this.#cfg.wsUrl);
    this.#escrowWs = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "subscribe", topic: "escrow_events" }));
    };

    ws.onmessage = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(String(ev.data)) as Record<string, unknown>;
        const eventName = typeof parsed.event === "string" ? parsed.event : "";
        if (eventName !== "escrow_event") return;
        const data = parsed.data as Record<string, unknown> | undefined;
        if (!data) return;
        const event: EscrowEvent = {
          action: String(data.action ?? ""),
          escrow_id: toBigInt(data.escrow_id),
          status: String(data.status ?? "created") as EscrowEvent["status"],
          buyer: toBigInt(data.buyer),
          seller: toBigInt(data.seller),
          amount: toBigInt(data.amount),
          timestamp: toBigInt(data.timestamp),
          raw: parsed,
        };
        for (const entry of this.#escrowHandlers) {
          if (!matchesEscrowFilter(event, entry.filter)) continue;
          entry.handler(event);
        }
      } catch {
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

type RpcAttempt<T> =
  | { ok: true; value: T }
  | { ok: false; retryable: true; error: RpcHttpError | RpcNetworkError }
  | { ok: false; retryable: false; error: RpcResponseError | RpcHttpError };

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function parseRpcResponse<T>(res: Response): Promise<RpcResponse<T>> {
  return (await res.json()) as RpcResponse<T>;
}

function toWireActor(value: string | bigint): string {
  return typeof value === "bigint" ? value.toString() : value;
}

function withDefaultCallerPrincipal(params: unknown): unknown {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return params;
  }
  const record = params as Record<string, unknown>;
  if ("caller_principal" in record) return params;
  return {
    ...record,
    caller_principal: 0,
  };
}

function toWireInteger(value: bigint, field: string): number {
  if (value < 0n) {
    throw new Error(`${field} must be non-negative`);
  }
  const out = Number(value);
  if (!Number.isSafeInteger(out)) {
    throw new Error(`${field} exceeds JSON safe integer range`);
  }
  return out;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") return BigInt(value);
  return 0n;
}

function toBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function parseBalance(raw: Record<string, unknown>): bigint {
  const candidates = [
    raw.balance,
    raw.balance_uspc,
    raw.uspc,
    raw.amount,
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === "bigint") return candidate;
    if (typeof candidate === "number") return BigInt(Math.trunc(candidate));
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) return BigInt(trimmed);
      continue;
    }
    if (typeof candidate === "object") {
      const value = (candidate as Record<string, unknown>).value;
      if (typeof value === "bigint") return value;
      if (typeof value === "number") return BigInt(Math.trunc(value));
      if (typeof value === "string" && value.trim().length > 0) {
        return BigInt(value.trim());
      }
    }
  }
  return 0n;
}

function mapEscrowMutationResult(raw: Record<string, unknown>): EscrowMutationResult {
  const out: EscrowMutationResult = {
    accepted: toBoolean(raw.accepted),
    escrow_id: toBigInt(raw.escrow_id),
    status: String(raw.status ?? "created") as EscrowMutationResult["status"],
  };
  if (raw.settled !== undefined) out.settled = toBoolean(raw.settled);
  if (raw.outcome !== undefined) {
    out.outcome = String(raw.outcome) as "release" | "refund";
  }
  return out;
}

function mapEscrowRecord(raw: Record<string, unknown>): EscrowRecord {
  return {
    accepted: toBoolean(raw.accepted),
    escrow_id: toBigInt(raw.escrow_id),
    mode: String(raw.mode ?? "2of2") as EscrowRecord["mode"],
    status: String(raw.status ?? "created") as EscrowRecord["status"],
    buyer: toBigInt(raw.buyer),
    seller: toBigInt(raw.seller),
    arbiter: toBigInt(raw.arbiter),
    amount: toBigInt(raw.amount),
    created_at: toBigInt(raw.created_at),
    auto_refund_at: toBigInt(raw.auto_refund_at),
    funded_at: toBigInt(raw.funded_at),
    closed_at: toBigInt(raw.closed_at),
    settlement: String(raw.settlement ?? "none") as EscrowRecord["settlement"],
  };
}

function matchesEscrowFilter(event: EscrowEvent, filter: EscrowEventFilter): boolean {
  if (filter.action && filter.action !== event.action) return false;
  if (filter.escrowId !== undefined && filter.escrowId !== event.escrow_id) return false;
  if (filter.status && filter.status !== event.status) return false;
  return true;
}
