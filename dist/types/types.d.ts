/**
 * Shared types for the Sierpinski RPC protocol.
 * Mirrors the JSON-RPC interface exposed by the Zig node.
 */
export interface RpcRequest {
    jsonrpc: "2.0";
    method: string;
    params?: unknown;
    id: number;
}
export interface RpcResponse<T = unknown> {
    jsonrpc: "2.0";
    result?: T;
    error?: RpcError;
    id: number;
}
export interface RpcError {
    code: number;
    message: string;
    data?: unknown;
}
export interface NodeInfo {
    nodeId: string;
    version: string;
    chainId: string;
    blockHeight: number;
    peers: number;
    synced: boolean;
}
export interface Block {
    height: number;
    hash: string;
    parentHash: string;
    timestamp: number;
    transactions: string[];
    validator: string;
}
export interface Transaction {
    hash: string;
    from: string;
    to: string;
    /** Amount in micro-SPC */
    amount: bigint;
    nonce: bigint;
    signature: string;
    pubkey: string;
    blockHeight?: number;
    status: "pending" | "confirmed" | "failed";
}
export interface BalanceResult {
    address: string;
    /** Balance in micro-SPC */
    balance: bigint;
}
export interface SendTxResult {
    txHash: string;
    status: "accepted" | "rejected";
    reason?: string;
}
export interface SignedTx {
    from: string;
    to: string;
    amount: bigint;
    nonce: bigint;
    signature: string;
    pubkey: string;
}
export interface SierpinskiClientConfig {
    /** Node RPC URL, e.g. "http://localhost:40410" */
    nodeUrl: string;
    /** Optional bearer token for authenticated nodes */
    authToken?: string;
    /** Timeout in ms for HTTP requests (default: 10_000) */
    timeoutMs?: number;
    /** WebSocket URL override (default: derived from nodeUrl) */
    wsUrl?: string;
    /** Auto-reconnect interval in ms (default: 3_000) */
    reconnectIntervalMs?: number;
}
export type SubscriptionTopic = "blocks" | "transactions" | "peers" | "contract_events" | "escrow_events";
export interface BlockEvent {
    type: "block";
    data: Block;
}
export interface TxEvent {
    type: "transaction";
    data: Transaction;
}
export type NodeEvent = BlockEvent | TxEvent;
export type EventHandler<T> = (event: T) => void;
export type UnsubscribeFn = () => void;
export type EscrowMode = "2of2" | "2of3";
export type EscrowStatus = "created" | "funded" | "released" | "refunded" | "disputed" | "resolved";
export type EscrowOutcome = "release" | "refund";
export interface CreateEscrowParams {
    escrow_id?: bigint;
    mode: EscrowMode;
    buyer: string | bigint;
    seller: string | bigint;
    arbiter?: string | bigint;
    amount: bigint;
    auto_refund_at?: bigint;
}
export interface EscrowActionParams {
    escrow_id: bigint;
    actor?: string | bigint;
}
export interface ResolveDisputeParams extends EscrowActionParams {
    actor: string | bigint;
    outcome: EscrowOutcome;
}
export interface GetEscrowParams {
    escrow_id: bigint;
    now?: bigint;
}
export interface EscrowRecord {
    accepted: boolean;
    escrow_id: bigint;
    mode: EscrowMode;
    status: EscrowStatus;
    buyer: bigint;
    seller: bigint;
    arbiter: bigint;
    amount: bigint;
    created_at: bigint;
    auto_refund_at: bigint;
    funded_at: bigint;
    closed_at: bigint;
    settlement: "none" | EscrowOutcome;
}
export interface EscrowMutationResult {
    accepted: boolean;
    escrow_id: bigint;
    status: EscrowStatus;
    settled?: boolean;
    outcome?: EscrowOutcome;
}
export interface EscrowEvent {
    action: string;
    escrow_id: bigint;
    status: EscrowStatus;
    buyer: bigint;
    seller: bigint;
    amount: bigint;
    timestamp: bigint;
    raw: unknown;
}
export interface EscrowEventFilter {
    action?: string;
    escrowId?: bigint;
    status?: EscrowStatus;
}
//# sourceMappingURL=types.d.ts.map