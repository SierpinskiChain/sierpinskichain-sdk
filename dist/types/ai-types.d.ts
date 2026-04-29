import type { SierpinskiClientConfig } from "./types.js";
export interface AiClientConfig extends SierpinskiClientConfig {
}
export interface FraudScoreResult {
    address: string;
    fraudScore: bigint;
    threshold: bigint;
    verdict: "clean" | "suspicious" | "fraud" | string;
}
export interface TrustEconomyResult {
    address: string;
    nodeId: bigint;
    trustMp: bigint;
    tier: string;
    feeDiscountBp: number;
    collateralBp: number;
    governanceWeight: bigint;
}
export interface McpStatusResult {
    status: string;
    model?: string;
    sessions?: number;
    raw: Record<string, unknown>;
}
export interface McpRestartResult {
    accepted: boolean;
    message?: string;
    raw: Record<string, unknown>;
}
export interface AiModel {
    id: string;
    loaded?: boolean;
    sizeBytes?: bigint;
    context?: number;
}
export interface AiModelListResult {
    models: AiModel[];
}
export interface LoadModelParams {
    model: string;
}
export interface LoadModelResult {
    accepted: boolean;
    model: string;
    raw: Record<string, unknown>;
}
export interface UnloadModelParams {
    model: string;
}
export interface UnloadModelResult {
    accepted: boolean;
    model: string;
    raw: Record<string, unknown>;
}
export interface InferParams {
    model: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}
export interface InferResult {
    accepted: boolean;
    model: string;
    output: string;
    tokens?: bigint;
    raw: Record<string, unknown>;
}
//# sourceMappingURL=ai-types.d.ts.map