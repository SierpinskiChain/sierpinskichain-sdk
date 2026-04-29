import type { BindingGenerationOptions, ContractAbi, WasmExportEntry } from "./contract-types.js";
export declare function extractWasmExports(bytes: BufferSource): WasmExportEntry[];
export declare function abiFromWasmExports(bytes: BufferSource): ContractAbi;
export declare function generateTypeScriptBindings(abi: ContractAbi, options: BindingGenerationOptions): string;
//# sourceMappingURL=contract-abi.d.ts.map