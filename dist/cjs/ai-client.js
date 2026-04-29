"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiClient = void 0;
const client_js_1 = require("./client.js");
function toBigInt(value) {
    if (typeof value === "bigint")
        return value;
    if (typeof value === "number")
        return BigInt(Math.trunc(value));
    if (typeof value === "string" && value.length > 0)
        return BigInt(value);
    return 0n;
}
function toNumber(value, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.length > 0) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed))
            return parsed;
    }
    return fallback;
}
function parseModel(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    const id = typeof obj.id === "string" ? obj.id : typeof obj.name === "string" ? obj.name : "";
    if (!id)
        return null;
    return {
        id,
        loaded: typeof obj.loaded === "boolean" ? obj.loaded : undefined,
        sizeBytes: obj.size_bytes !== undefined ? toBigInt(obj.size_bytes) : undefined,
        context: obj.context !== undefined ? toNumber(obj.context) : undefined,
    };
}
class AiClient {
    #sdk;
    constructor(config) {
        this.#sdk = new client_js_1.SierpinskiClient(config);
    }
    async getFraudScore(address) {
        const raw = await this.#sdk.rpc("getFraudScore", { address });
        return {
            address: String(raw.address ?? address),
            fraudScore: toBigInt(raw.fraud_score),
            threshold: toBigInt(raw.threshold),
            verdict: String(raw.verdict ?? "clean"),
        };
    }
    async getTrustEconomy(address) {
        const raw = await this.#sdk.rpc("getTrustEconomy", { address });
        return {
            address: String(raw.address ?? address),
            nodeId: toBigInt(raw.node_id),
            trustMp: toBigInt(raw.trust_mp),
            tier: String(raw.tier ?? "unknown"),
            feeDiscountBp: toNumber(raw.fee_discount_bp),
            collateralBp: toNumber(raw.collateral_bp),
            governanceWeight: toBigInt(raw.governance_weight),
        };
    }
    async mcpStatus() {
        const raw = await this.#sdk.rpc("mcpStatus");
        return {
            status: String(raw.status ?? "unknown"),
            model: raw.model !== undefined ? String(raw.model) : undefined,
            sessions: raw.sessions !== undefined ? toNumber(raw.sessions) : undefined,
            raw,
        };
    }
    async mcpRestart() {
        const raw = await this.#sdk.rpc("mcpRestart");
        return {
            accepted: Boolean(raw.accepted),
            message: raw.message !== undefined ? String(raw.message) : undefined,
            raw,
        };
    }
    async listModels() {
        const raw = await this.#sdk.rpc("listModels");
        const modelsRaw = Array.isArray(raw.models) ? raw.models : [];
        const models = [];
        for (const entry of modelsRaw) {
            const parsed = parseModel(entry);
            if (parsed)
                models.push(parsed);
        }
        return { models };
    }
    async loadModel(params) {
        const raw = await this.#sdk.rpc("loadModel", {
            model: params.model,
        });
        return {
            accepted: Boolean(raw.accepted),
            model: String(raw.model ?? params.model),
            raw,
        };
    }
    async unloadModel(params) {
        const raw = await this.#sdk.rpc("unloadModel", {
            model: params.model,
        });
        return {
            accepted: Boolean(raw.accepted),
            model: String(raw.model ?? params.model),
            raw,
        };
    }
    async infer(params) {
        const raw = await this.#sdk.rpc("aiInfer", {
            model: params.model,
            prompt: params.prompt,
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            stream: params.stream,
        });
        return {
            accepted: Boolean(raw.accepted ?? true),
            model: String(raw.model ?? params.model),
            output: String(raw.output ?? raw.text ?? ""),
            tokens: raw.tokens !== undefined ? toBigInt(raw.tokens) : undefined,
            raw,
        };
    }
}
exports.AiClient = AiClient;
//# sourceMappingURL=ai-client.js.map