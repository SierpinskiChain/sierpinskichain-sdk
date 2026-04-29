import type { AiClientConfig, AiModelListResult, FraudScoreResult, InferParams, InferResult, LoadModelParams, LoadModelResult, McpRestartResult, McpStatusResult, TrustEconomyResult, UnloadModelParams, UnloadModelResult } from "./ai-types.js";
export declare class AiClient {
    #private;
    constructor(config: AiClientConfig);
    getFraudScore(address: string): Promise<FraudScoreResult>;
    getTrustEconomy(address: string): Promise<TrustEconomyResult>;
    mcpStatus(): Promise<McpStatusResult>;
    mcpRestart(): Promise<McpRestartResult>;
    listModels(): Promise<AiModelListResult>;
    loadModel(params: LoadModelParams): Promise<LoadModelResult>;
    unloadModel(params: UnloadModelParams): Promise<UnloadModelResult>;
    infer(params: InferParams): Promise<InferResult>;
}
//# sourceMappingURL=ai-client.d.ts.map