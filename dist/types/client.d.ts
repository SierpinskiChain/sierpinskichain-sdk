/**
 * SierpinskiClient — typed JSON-RPC HTTP client + WebSocket event stream.
 *
 * HTTP: plain fetch() for queries (Bun + Node 18+ compatible).
 * WebSocket: optional; auto-reconnects on disconnect.
 */
import type { SierpinskiClientConfig, NodeInfo, Block, Transaction, BalanceResult, SendTxResult, NodeEvent, EventHandler, UnsubscribeFn, SubscriptionTopic, CreateEscrowParams, EscrowActionParams, ResolveDisputeParams, GetEscrowParams, EscrowRecord, EscrowMutationResult, EscrowEvent, EscrowEventFilter, SignedTx } from "./types.js";
export declare class SierpinskiClient {
    #private;
    constructor(config: SierpinskiClientConfig);
    /** Fetch node metadata (version, height, peers, sync status). */
    getNodeInfo(): Promise<NodeInfo>;
    /** Fetch block by height. */
    getBlock(height: number): Promise<Block>;
    /** Fetch the latest block. */
    getLatestBlock(): Promise<Block>;
    /** Fetch transaction by hash. */
    getTransaction(txHash: string): Promise<Transaction>;
    /** Get balance for a .sp address. Returns micro-SPC as bigint. */
    getBalance(address: string): Promise<bigint>;
    /** Get full balance result including address echo. */
    getBalanceFull(address: string): Promise<BalanceResult>;
    /** Broadcast a signed transaction. */
    sendTransaction(tx: SignedTx): Promise<SendTxResult>;
    /** Generic JSON-RPC call for SDK extension packages. */
    rpc<T>(method: string, params?: unknown): Promise<T>;
    createEscrow(params: CreateEscrowParams): Promise<EscrowMutationResult>;
    fundEscrow(params: EscrowActionParams): Promise<EscrowMutationResult>;
    releaseEscrow(params: EscrowActionParams): Promise<EscrowMutationResult>;
    refundEscrow(params: EscrowActionParams): Promise<EscrowMutationResult>;
    disputeEscrow(params: EscrowActionParams): Promise<EscrowMutationResult>;
    resolveDispute(params: ResolveDisputeParams): Promise<EscrowMutationResult>;
    getEscrow(params: GetEscrowParams): Promise<EscrowRecord>;
    subscribeEscrowEvents(filter: EscrowEventFilter, handler: EventHandler<EscrowEvent>): UnsubscribeFn;
    /** Subscribe to real-time node events. Returns unsubscribe function. */
    subscribe<T extends NodeEvent>(topic: SubscriptionTopic, handler: EventHandler<T>): UnsubscribeFn;
    /** Disconnect WebSocket and cancel reconnect timer. */
    disconnect(): void;
    get wsConnected(): boolean;
}
//# sourceMappingURL=client.d.ts.map