import { SierpinskiClient } from "./client.js";
import type {
  DownloadFileParams,
  DownloadFileResult,
  EstimateStorageCostParams,
  EstimateStorageCostResult,
  GetStorageInfoParams,
  PinFileParams,
  PinFileResult,
  RespondStorageChallengeParams,
  RespondStorageChallengeResult,
  RetrievalProofParams,
  RetrievalProofResult,
  StorageClientConfig,
  StorageProviderInfo,
  StorageStats,
  UploadFileParams,
  UploadFileResult,
} from "./storage-types.js";

function toWireInteger(value: bigint | number, field: string): string {
  if (typeof value === "bigint") return value.toString();
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return String(value);
}

function toWireActor(value: string | bigint): string {
  return typeof value === "bigint" ? value.toString() : value;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  return 0n;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.length > 0) {
    const n = Number.parseInt(value, 10);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += String.fromCharCode(b);
  if (typeof btoa === "function") return btoa(out);
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  throw new Error("base64 encoding unavailable");
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
  }
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(base64, "base64"));
  throw new Error("base64 decoding unavailable");
}

function normalizeBytes(data: Uint8Array | string): Uint8Array {
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  return data;
}

export class StorageClient {
  readonly #sdk: SierpinskiClient;
  readonly #cfg: Required<Pick<StorageClientConfig, "defaultReplication" | "defaultDurationEpochs">>;

  constructor(config: StorageClientConfig) {
    this.#sdk = new SierpinskiClient(config);
    this.#cfg = {
      defaultReplication: config.defaultReplication ?? 3,
      defaultDurationEpochs: config.defaultDurationEpochs ?? 1,
    };
  }

  async getStorageInfo(params: GetStorageInfoParams = {}): Promise<StorageProviderInfo> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("getStorageInfo", {
      provider_id:
        params.providerId !== undefined
          ? toWireInteger(params.providerId, "providerId")
          : undefined,
    });
    return {
      providerId: toBigInt(raw.provider_id),
      status: toNumber(raw.status),
      stake: toBigInt(raw.stake),
      capacityBytes: toBigInt(raw.capacity_bytes),
      usedBytes: toBigInt(raw.used_bytes),
      totalRewards: toBigInt(raw.total_rewards),
      totalSlashed: toBigInt(raw.total_slashed),
      uptimeEpochs: toBigInt(raw.uptime_epochs),
      totalEpochs: toBigInt(raw.total_epochs),
      challengesPassed: toBigInt(raw.challenges_passed),
      challengesTotal: toBigInt(raw.challenges_total),
      slashCount: toBigInt(raw.slash_count),
      currentEpoch: toBigInt(raw.current_epoch),
    };
  }

  async respondStorageChallenge(
    params: RespondStorageChallengeParams,
  ): Promise<RespondStorageChallengeResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("respondStorageChallenge", {
      challenge_id: toWireInteger(params.challengeId, "challengeId"),
      passed: params.passed,
    });
    return {
      accepted: Boolean(raw.accepted),
      challengeId: toBigInt(raw.challenge_id),
      passed: Boolean(raw.passed),
    };
  }

  async getStorageStats(): Promise<StorageStats> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("getStorageStats");
    return {
      activeProviders: toBigInt(raw.active_providers),
      totalCapacityBytes: toBigInt(raw.total_capacity_bytes),
      totalUsedBytes: toBigInt(raw.total_used_bytes),
      pendingChallenges: toBigInt(raw.pending_challenges),
      totalRewardsPaid: toBigInt(raw.total_rewards_paid),
      currentEpoch: toBigInt(raw.current_epoch),
    };
  }

  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    const bytes = normalizeBytes(params.data);
    const raw = await this.#sdk.rpc<Record<string, unknown>>("storeFile", {
      payload_base64: bytesToBase64(bytes),
      owner: params.owner !== undefined ? toWireActor(params.owner) : undefined,
      replication: params.replication ?? this.#cfg.defaultReplication,
      duration_epochs: params.durationEpochs ?? this.#cfg.defaultDurationEpochs,
      metadata: params.metadata,
    });
    return {
      accepted: Boolean(raw.accepted),
      fileId: String(raw.file_id ?? ""),
      bytes: toBigInt(raw.bytes),
      replication: toNumber(raw.replication, this.#cfg.defaultReplication),
      costUspc: raw.cost_uspc !== undefined ? toBigInt(raw.cost_uspc) : undefined,
    };
  }

  async downloadFile(params: DownloadFileParams): Promise<DownloadFileResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("retrieveFile", {
      file_id: params.fileId,
    });
    return {
      accepted: Boolean(raw.accepted),
      fileId: String(raw.file_id ?? params.fileId),
      bytes: base64ToBytes(String(raw.payload_base64 ?? "")),
      sizeBytes: toBigInt(raw.size_bytes),
    };
  }

  async pinFile(params: PinFileParams): Promise<PinFileResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("pinFile", {
      file_id: params.fileId,
      owner: params.owner !== undefined ? toWireActor(params.owner) : undefined,
    });
    return {
      accepted: Boolean(raw.accepted),
      fileId: String(raw.file_id ?? params.fileId),
      pinned: Boolean(raw.pinned),
    };
  }

  async unpinFile(params: PinFileParams): Promise<PinFileResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("unpinFile", {
      file_id: params.fileId,
      owner: params.owner !== undefined ? toWireActor(params.owner) : undefined,
    });
    return {
      accepted: Boolean(raw.accepted),
      fileId: String(raw.file_id ?? params.fileId),
      pinned: Boolean(raw.pinned),
    };
  }

  async getRetrievalProof(params: RetrievalProofParams): Promise<RetrievalProofResult> {
    const raw = await this.#sdk.rpc<Record<string, unknown>>("getRetrievalProof", {
      file_id: params.fileId,
      chunk_index:
        params.chunkIndex !== undefined
          ? toWireInteger(params.chunkIndex, "chunkIndex")
          : undefined,
    });
    return {
      accepted: Boolean(raw.accepted),
      fileId: String(raw.file_id ?? params.fileId),
      proof: String(raw.proof ?? ""),
      root: raw.root !== undefined ? String(raw.root) : undefined,
    };
  }

  async estimateStorageCost(
    params: EstimateStorageCostParams,
  ): Promise<EstimateStorageCostResult> {
    const replication = params.replication ?? this.#cfg.defaultReplication;
    const duration = params.durationEpochs ?? this.#cfg.defaultDurationEpochs;
    const raw = await this.#sdk.rpc<Record<string, unknown>>("estimateStorageCost", {
      bytes: toWireInteger(params.bytes, "bytes"),
      replication,
      duration_epochs: duration,
    });
    return {
      bytes: toBigInt(raw.bytes ?? params.bytes),
      replication: toNumber(raw.replication, replication),
      durationEpochs: toNumber(raw.duration_epochs, duration),
      totalCostUspc: toBigInt(raw.total_cost_uspc),
    };
  }
}
