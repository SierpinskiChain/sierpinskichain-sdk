import type { DownloadFileParams, DownloadFileResult, EstimateStorageCostParams, EstimateStorageCostResult, GetStorageInfoParams, PinFileParams, PinFileResult, RespondStorageChallengeParams, RespondStorageChallengeResult, RetrievalProofParams, RetrievalProofResult, StorageClientConfig, StorageProviderInfo, StorageStats, UploadFileParams, UploadFileResult } from "./storage-types.js";
export declare class StorageClient {
    #private;
    constructor(config: StorageClientConfig);
    getStorageInfo(params?: GetStorageInfoParams): Promise<StorageProviderInfo>;
    respondStorageChallenge(params: RespondStorageChallengeParams): Promise<RespondStorageChallengeResult>;
    getStorageStats(): Promise<StorageStats>;
    uploadFile(params: UploadFileParams): Promise<UploadFileResult>;
    downloadFile(params: DownloadFileParams): Promise<DownloadFileResult>;
    pinFile(params: PinFileParams): Promise<PinFileResult>;
    unpinFile(params: PinFileParams): Promise<PinFileResult>;
    getRetrievalProof(params: RetrievalProofParams): Promise<RetrievalProofResult>;
    estimateStorageCost(params: EstimateStorageCostParams): Promise<EstimateStorageCostResult>;
}
//# sourceMappingURL=storage-client.d.ts.map