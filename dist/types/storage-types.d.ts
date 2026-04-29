import type { SierpinskiClientConfig } from "./types.js";
export interface StorageClientConfig extends SierpinskiClientConfig {
    defaultReplication?: number;
    defaultDurationEpochs?: number;
}
export interface GetStorageInfoParams {
    providerId?: bigint | number;
}
export interface StorageProviderInfo {
    providerId: bigint;
    status: number;
    stake: bigint;
    capacityBytes: bigint;
    usedBytes: bigint;
    totalRewards: bigint;
    totalSlashed: bigint;
    uptimeEpochs: bigint;
    totalEpochs: bigint;
    challengesPassed: bigint;
    challengesTotal: bigint;
    slashCount: bigint;
    currentEpoch: bigint;
}
export interface RespondStorageChallengeParams {
    challengeId: bigint | number;
    passed: boolean;
}
export interface RespondStorageChallengeResult {
    accepted: boolean;
    challengeId: bigint;
    passed: boolean;
}
export interface StorageStats {
    activeProviders: bigint;
    totalCapacityBytes: bigint;
    totalUsedBytes: bigint;
    pendingChallenges: bigint;
    totalRewardsPaid: bigint;
    currentEpoch: bigint;
}
export interface UploadFileParams {
    data: Uint8Array | string;
    owner?: string | bigint;
    replication?: number;
    durationEpochs?: number;
    metadata?: Record<string, string>;
}
export interface UploadFileResult {
    accepted: boolean;
    fileId: string;
    bytes: bigint;
    replication: number;
    costUspc?: bigint;
}
export interface DownloadFileParams {
    fileId: string;
}
export interface DownloadFileResult {
    accepted: boolean;
    fileId: string;
    bytes: Uint8Array;
    sizeBytes: bigint;
}
export interface PinFileParams {
    fileId: string;
    owner?: string | bigint;
}
export interface PinFileResult {
    accepted: boolean;
    fileId: string;
    pinned: boolean;
}
export interface RetrievalProofParams {
    fileId: string;
    chunkIndex?: bigint | number;
}
export interface RetrievalProofResult {
    accepted: boolean;
    fileId: string;
    proof: string;
    root?: string;
}
export interface EstimateStorageCostParams {
    bytes: bigint | number;
    replication?: number;
    durationEpochs?: number;
}
export interface EstimateStorageCostResult {
    bytes: bigint;
    replication: number;
    durationEpochs: number;
    totalCostUspc: bigint;
}
//# sourceMappingURL=storage-types.d.ts.map