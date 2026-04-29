import { SierpinskiClient } from "./client.js";
import type {
  AiClientConfig,
  AiModel,
  AiModelListResult,
  FraudScoreResult,
  InferParams,
  InferResult,
  LoadModelParams,
  LoadModelResult,
  McpRestartResult,
  McpStatusResult,
  TrustEconomyResult,
  UnloadModelParams,
  UnloadModelResult,
} from "./ai-types.js";

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  return 0n;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function parseModel(raw: unknown): AiModel | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === "string" ? obj.id : typeof obj.name === "string" ? obj.name : "";
  if (!id) return null;
  return {
    id,
    loaded: typeof obj.loaded === "boolean" ? obj.loaded : undefined,
    sizeBytes: obj.size_bytes !== undefined ? toBigInt(obj.size_bytes) : undefined,
    context: obj.context !== undefined ? toNumber(obj.context) : undefined,
  };
}

export class AiClient {
  readonly #sdk: SierpinskiClient;

  constructor(config: AiClientConfig) {
    this.#sdk = new SierpinskiClient(config);
  }

  async getFraudScore(address: string): Promise<FraudScoreResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("getFraudScore", { address });
    return {
      address: String(raw.address ?? address),
      fraudScore: toBigInt(raw.fraud_score),
      threshold: toBigInt(raw.threshold),
      verdict: String(raw.verdict ?? "clean"),
    };
  }

  async getTrustEconomy(address: string): Promise<TrustEconomyResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("getTrustEconomy", { address });
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

  async mcpStatus(): Promise<McpStatusResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("mcpStatus");
    return {
      status: String(raw.status ?? "unknown"),
      model: raw.model !== undefined ? String(raw.model) : undefined,
      sessions: raw.sessions !== undefined ? toNumber(raw.sessions) : undefined,
      raw,
    };
  }

  async mcpRestart(): Promise<McpRestartResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("mcpRestart");
    return {
      accepted: Boolean(raw.accepted),
      message: raw.message !== undefined ? String(raw.message) : undefined,
      raw,
    };
  }

  async listModels(): Promise<AiModelListResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("listModels");
    const modelsRaw = Array.isArray(raw.models) ? raw.models : [];
    const models: AiModel[] = [];
    for (const entry of modelsRaw) {
      const parsed = parseModel(entry);
      if (parsed) models.push(parsed);
    }
    return { models };
  }

  async loadModel(params: LoadModelParams): Promise<LoadModelResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("loadModel", {
      model: params.model,
    });
    return {
      accepted: Boolean(raw.accepted),
      model: String(raw.model ?? params.model),
      raw,
    };
  }

  async unloadModel(params: UnloadModelParams): Promise<UnloadModelResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("unloadModel", {
      model: params.model,
    });
    return {
      accepted: Boolean(raw.accepted),
      model: String(raw.model ?? params.model),
      raw,
    };
  }

  async infer(params: InferParams): Promise<InferResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("aiInfer", {
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
