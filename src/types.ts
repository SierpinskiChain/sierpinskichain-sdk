/**
 * Shared types for the Sierpinski RPC protocol.
 * Mirrors the JSON-RPC interface exposed by the Zig node.
 */

// ── JSON-RPC wire types ───────────────────────────────────────────────────────

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

// ── Domain types ─────────────────────────────────────────────────────────────

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

// ── Client config ─────────────────────────────────────────────────────────────

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

// ── WebSocket subscription types ──────────────────────────────────────────────

export type SubscriptionTopic = "blocks" | "transactions" | "peers";

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
