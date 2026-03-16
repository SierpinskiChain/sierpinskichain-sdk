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
} from "./types.js";
import type { SignedTx } from "@sierpinski/wallet-ts";

export class SierpinskiClient {
  readonly #cfg: Required<SierpinskiClientConfig>;
  #rpcId = 0;

  // WS state
  #ws: WebSocket | null = null;
  #wsReady = false;
  #wsHandlers = new Map<SubscriptionTopic, Set<EventHandler<NodeEvent>>>();
  #wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #wsConnecting = false;

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
    return this.#rpc<NodeInfo>("getNodeInfo");
  }

  /** Fetch block by height. */
  getBlock(height: number): Promise<Block> {
    return this.#rpc<Block>("getBlock", { height });
  }

  /** Fetch the latest block. */
  getLatestBlock(): Promise<Block> {
    return this.#rpc<Block>("getLatestBlock");
  }

  /** Fetch transaction by hash. */
  getTransaction(txHash: string): Promise<Transaction> {
    return this.#rpc<Transaction>("getTransaction", { txHash });
  }

  /** Get balance for a .sp address. Returns micro-SPC as bigint. */
  async getBalance(address: string): Promise<bigint> {
    const raw = await this.#rpc<{ address: string; balance: string }>(
      "getBalance",
      { address },
    );
    return BigInt(raw.balance);
  }

  /** Get full balance result including address echo. */
  async getBalanceFull(address: string): Promise<BalanceResult> {
    const raw = await this.#rpc<{ address: string; balance: string }>(
      "getBalance",
      { address },
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
  }

  get wsConnected(): boolean {
    return this.#wsReady;
  }
}
