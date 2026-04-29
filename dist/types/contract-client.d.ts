import type { CallParams, CallResult, ContractClientConfig, ContractEventFilter, ContractEventHandler, DeployParams, DeployResult, QueryParams, QueryResult, UnsubscribeFn } from "./contract-types.js";
export declare class ContractClient {
    #private;
    constructor(config: ContractClientConfig);
    deploy(params: DeployParams): Promise<DeployResult>;
    call(params: CallParams): Promise<CallResult>;
    query(params: QueryParams): Promise<QueryResult>;
    subscribeEvents(filter: ContractEventFilter, handler: ContractEventHandler): UnsubscribeFn;
    disconnect(): void;
}
//# sourceMappingURL=contract-client.d.ts.map