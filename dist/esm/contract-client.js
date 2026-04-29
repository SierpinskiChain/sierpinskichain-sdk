import { SierpinskiClient } from "./client.js";
function toContractEvent(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    const eventName = typeof obj.event === "string" ? obj.event : typeof obj.type === "string" ? obj.type : "";
    if (eventName !== "contract_event" && eventName !== "contract")
        return null;
    const data = obj.data && typeof obj.data === "object"
        ? obj.data
        : obj;
    return {
        event: eventName,
        contract: typeof data.contract === "string" ? data.contract : undefined,
        key: typeof data.key === "string" ? data.key : undefined,
        value: typeof data.value === "string" ? data.value : undefined,
        data,
        raw,
    };
}
function matchesFilter(event, filter) {
    if (filter.event && filter.event !== event.event)
        return false;
    if (filter.contract && filter.contract !== event.contract)
        return false;
    if (filter.key && filter.key !== event.key)
        return false;
    return true;
}
export class ContractClient {
    #sdk;
    #cfg;
    #ws = null;
    #handlers = new Set();
    constructor(config) {
        this.#sdk = new SierpinskiClient(config);
        this.#cfg = {
            wsUrl: config.wsUrl ?? config.nodeUrl.replace(/^http/, "ws") + "/ws",
            contractEventTopic: config.contractEventTopic ?? "contract_events",
        };
    }
    deploy(params) {
        return this.#sdk.rpc("deployContract", params);
    }
    call(params) {
        return this.#sdk.rpc("callContract", params);
    }
    query(params) {
        return this.#sdk.rpc("queryContract", params);
    }
    subscribeEvents(filter, handler) {
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
    #ensureWs() {
        if (this.#ws)
            return;
        const ws = new WebSocket(this.#cfg.wsUrl);
        this.#ws = ws;
        ws.onopen = () => {
            ws.send(JSON.stringify({
                action: "subscribe",
                topic: this.#cfg.contractEventTopic,
            }));
        };
        ws.onmessage = (ev) => {
            try {
                const parsed = JSON.parse(String(ev.data));
                const event = toContractEvent(parsed);
                if (!event)
                    return;
                for (const entry of this.#handlers) {
                    if (matchesFilter(event, entry.filter)) {
                        entry.handler(event);
                    }
                }
            }
            catch {
                // ignore malformed frames
            }
        };
        ws.onclose = () => {
            this.#ws = null;
        };
    }
    disconnect() {
        this.#ws?.close();
        this.#ws = null;
    }
}
//# sourceMappingURL=contract-client.js.map