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
} from "./types.js";
import type { SignedTx } from "@sierpinski/wallet";

export class SierpinskiClient {
  readonly #cfg: Required<SierpinskiClientConfig>;
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
    this.#cfg = {
      nodeUrl,
      authToken: config.authToken ?? "",
      timeoutMs: config.timeoutMs ?? 10_000,
      wsUrl: config.wsUrl ?? nodeUrl.replace(/^http/, "ws") + "/ws",
      reconnectIntervalMs: config.reconnectIntervalMs ?? 3_000,
    };
  }

  // ── HTTP RPC ─────────────────────────────────────────────────────────────

  async #rpc<T>(method: string, params?: unknown): Promise<T> {
    const body: RpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: ++this.#rpcId,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.#cfg.authToken) {
      headers["Authorization"] = `Bearer ${this.#cfg.authToken}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#cfg.timeoutMs);

    let res: globalThis.Response;
    try {
      res = await fetch(`${this.#cfg.nodeUrl}/rpc`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from node`);
    }

    const json = (await res.json()) as RpcResponse<T>;
    if (json.error) {
      throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
    }
    return json.result as T;
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
    const raw = await this.#rpc<{ address: string; balance: string }>(
      "getBalance",
      { address, caller_principal: 0 },
    );
    return BigInt(raw.balance);
  }

  /** Get full balance result including address echo. */
  async getBalanceFull(address: string): Promise<BalanceResult> {
    const raw = await this.#rpc<{ address: string; balance: string }>(
      "getBalance",
      { address, caller_principal: 0 },
    );
    return { address: raw.address, balance: BigInt(raw.balance) };
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
    return this.#rpc<T>(method, params);
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
    });
    return mapEscrowMutationResult(raw);
  }

  async fundEscrow(params: EscrowActionParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("fundEscrow", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
    });
    return mapEscrowMutationResult(raw);
  }

  async releaseEscrow(params: EscrowActionParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("releaseEscrow", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
    });
    return mapEscrowMutationResult(raw);
  }

  async refundEscrow(params: EscrowActionParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("refundEscrow", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
    });
    return mapEscrowMutationResult(raw);
  }

  async disputeEscrow(params: EscrowActionParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("disputeEscrow", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: params.actor !== undefined ? toWireActor(params.actor) : undefined,
    });
    return mapEscrowMutationResult(raw);
  }

  async resolveDispute(params: ResolveDisputeParams): Promise<EscrowMutationResult> {
    const raw = await this.#rpc<Record<string, unknown>>("resolveDispute", {
      escrow_id: toWireInteger(params.escrow_id, "escrow_id"),
      actor: toWireActor(params.actor),
      outcome: params.outcome,
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

function toWireActor(value: string | bigint): string {
  return typeof value === "bigint" ? value.toString() : value;
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
