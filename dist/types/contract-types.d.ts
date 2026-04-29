import type { SierpinskiClientConfig } from "./types.js";
export interface ContractClientConfig extends SierpinskiClientConfig {
    /** WebSocket topic used for contract events. */
    contractEventTopic?: string;
}
export interface DeployParams {
    contract: string;
    key?: string;
    value?: string;
}
export interface DeployResult {
    accepted: boolean;
    contract: string;
    keys: number;
}
export interface CallParams {
    contract: string;
    key: string;
    value: string;
}
export interface CallResult {
    accepted: boolean;
    contract: string;
    key: string;
}
export interface QueryParams {
    contract: string;
    key: string;
}
export interface QueryResult {
    accepted: boolean;
    contract: string;
    key: string;
    found: boolean;
    value?: string;
}
export interface ContractEvent {
    event: string;
    contract?: string;
    key?: string;
    value?: string;
    data: Record<string, unknown>;
    raw: unknown;
}
export interface ContractEventFilter {
    event?: string;
    contract?: string;
    key?: string;
}
export type ContractEventHandler = (event: ContractEvent) => void;
export type UnsubscribeFn = () => void;
export type WasmExportKind = "function" | "table" | "memory" | "global";
export type AbiMode = "query" | "call";
export interface WasmExportEntry {
    name: string;
    kind: WasmExportKind;
}
export interface AbiMethod {
    name: string;
    mode: AbiMode;
}
export interface ContractAbi {
    methods: AbiMethod[];
}
export interface BindingGenerationOptions {
    contract: string;
    clientVarName?: string;
}
//# sourceMappingURL=contract-types.d.ts.map