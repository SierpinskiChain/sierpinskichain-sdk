import { SierpinskiClient } from "./client.js";
import type {
  CallParams,
  CallResult,
  ContractClientConfig,
  ContractEvent,
  ContractEventFilter,
  ContractEventHandler,
  DeployParams,
  DeployResult,
  QueryParams,
  QueryResult,
  UnsubscribeFn,
} from "./contract-types.js";

function toContractEvent(raw: unknown): ContractEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const eventName = typeof obj.event === "string" ? obj.event : typeof obj.type === "string" ? obj.type : "";
  if (eventName !== "contract_event" && eventName !== "contract") return null;
  const data =
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>)
      : (obj as Record<string, unknown>);
  return {
    event: eventName,
    contract: typeof data.contract === "string" ? data.contract : undefined,
    key: typeof data.key === "string" ? data.key : undefined,
    value: typeof data.value === "string" ? data.value : undefined,
    data,
    raw,
  };
}

function matchesFilter(event: ContractEvent, filter: ContractEventFilter): boolean {
  if (filter.event && filter.event !== event.event) return false;
  if (filter.contract && filter.contract !== event.contract) return false;
  if (filter.key && filter.key !== event.key) return false;
  return true;
}

export class ContractClient {
  readonly #sdk: SierpinskiClient;
  readonly #cfg: Required<Pick<ContractClientConfig, "wsUrl" | "contractEventTopic">>;
  #ws: WebSocket | null = null;
  #handlers = new Set<{ filter: ContractEventFilter; handler: ContractEventHandler }>();

  constructor(config: ContractClientConfig) {
    this.#sdk = new SierpinskiClient(config);
    this.#cfg = {
      wsUrl: config.wsUrl ?? config.nodeUrl.replace(/^http/, "ws") + "/ws",
      contractEventTopic: config.contractEventTopic ?? "contract_events",
    };
  }

  deploy(params: DeployParams): Promise<DeployResult> {
    return this.#sdk.rpc<DeployResult>("deployContract", params);
  }

  call(params: CallParams): Promise<CallResult> {
    return this.#sdk.rpc<CallResult>("callContract", params);
  }

  query(params: QueryParams): Promise<QueryResult> {
    return this.#sdk.rpc<QueryResult>("queryContract", params);
  }

  subscribeEvents(
    filter: ContractEventFilter,
    handler: ContractEventHandler,
  ): UnsubscribeFn {
    this.#handlers.add({ filter, handler });
    this.#ensureWs();
    return () => {
      for (const entry of this.#handlers) {
        if (entry.handler === handler) {
          this.#handlers.delete(entry);
          break;
        }
      }
      if (this.#handlers.size === 0) {
        this.disconnect();
      }
    };
  }

  #ensureWs(): void {
    if (this.#ws) return;
    const ws = new WebSocket(this.#cfg.wsUrl);
    this.#ws = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: "subscribe",
          topic: this.#cfg.contractEventTopic,
        }),
      );
    };

    ws.onmessage = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(String(ev.data));
        const event = toContractEvent(parsed);
        if (!event) return;
        for (const entry of this.#handlers) {
          if (matchesFilter(event, entry.filter)) {
            entry.handler(event);
          }
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      this.#ws = null;
    };
  }

  disconnect(): void {
    this.#ws?.close();
    this.#ws = null;
  }
}
