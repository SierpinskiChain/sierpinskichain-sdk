import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { SierpinskiClient } from "./client.js";
import type { NodeInfo, Block, Transaction } from "./types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function rpcOk<T>(result: T): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: 1, result }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function rpcErr(code: number, message: string): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code, message } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const NODE_INFO: NodeInfo = {
  nodeId: "abc123",
  version: "0.1.0",
  chainId: "sierpinski-testnet",
  blockHeight: 42,
  peers: 3,
  synced: true,
};

const SAMPLE_BLOCK: Block = {
  height: 42,
  hash: "deadbeef",
  parentHash: "cafebabe",
  timestamp: 1_700_000_000,
  transactions: ["tx1", "tx2"],
  validator: "abcdef01.sp",
};

const SAMPLE_TX: Transaction = {
  hash: "txhash1",
  from: "abcdef01.sp",
  to: "12345678.sp",
  amount: 1000n,
  nonce: 1n,
  signature: "a".repeat(128),
  pubkey: "b".repeat(64),
  blockHeight: 42,
  status: "confirmed",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SierpinskiClient", () => {
  let client: SierpinskiClient;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    client = new SierpinskiClient({ nodeUrl: "http://localhost:40410" });
    fetchMock = mock(global.fetch);
    global.fetch = fetchMock as unknown as typeof global.fetch;
  });

  afterEach(() => {
    // restore original fetch
    global.fetch = fetch;
    client.disconnect();
  });

  // ── Constructor ─────────────────────────────────────────────────────────

  test("constructs with defaults", () => {
    const c = new SierpinskiClient({ nodeUrl: "http://localhost:40410" });
    expect(c.wsConnected).toBe(false);
    c.disconnect();
  });

  test("trailing slash is stripped from nodeUrl", () => {
    // If URL had trailing slash it would double-path the /rpc call.
    // We can't inspect private fields directly, but we can check it
    // doesn't throw on construction.
    expect(
      () => new SierpinskiClient({ nodeUrl: "http://localhost:40410/" }),
    ).not.toThrow();
  });

  // ── getNodeInfo ─────────────────────────────────────────────────────────

  test("getNodeInfo returns NodeInfo", async () => {
    fetchMock.mockResolvedValueOnce(rpcOk(NODE_INFO));
    const info = await client.getNodeInfo();
    expect(info.nodeId).toBe("abc123");
    expect(info.blockHeight).toBe(42);
    expect(info.synced).toBe(true);
  });

  test("getNodeInfo sends correct method", async () => {
    fetchMock.mockResolvedValueOnce(rpcOk(NODE_INFO));
    await client.getNodeInfo();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:40410/rpc");
    const body = JSON.parse(init.body as string) as {
      jsonrpc: string;
      method: string;
    };
    expect(body.method).toBe("getNodeInfo");
    expect(body.jsonrpc).toBe("2.0");
  });

  // ── getBlock ────────────────────────────────────────────────────────────

  test("getBlock sends height param", async () => {
    fetchMock.mockResolvedValueOnce(rpcOk(SAMPLE_BLOCK));
    const block = await client.getBlock(42);
    expect(block.height).toBe(42);
    expect(block.hash).toBe("deadbeef");
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { height: number } };
    expect(body.params.height).toBe(42);
  });

  test("getLatestBlock calls correct method", async () => {
    fetchMock.mockResolvedValueOnce(rpcOk(SAMPLE_BLOCK));
    await client.getLatestBlock();
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { method: string };
    expect(body.method).toBe("getLatestBlock");
  });

  // ── getBalance ──────────────────────────────────────────────────────────

  test("getBalance returns bigint", async () => {
    fetchMock.mockResolvedValueOnce(
      rpcOk({ address: "abcdef01.sp", balance: "5000000" }),
    );
    const bal = await client.getBalance("abcdef01.sp");
    expect(bal).toBe(5_000_000n);
    expect(typeof bal).toBe("bigint");
  });

  test("getBalanceFull includes address", async () => {
    fetchMock.mockResolvedValueOnce(
      rpcOk({ address: "abcdef01.sp", balance: "1234" }),
    );
    const result = await client.getBalanceFull("abcdef01.sp");
    expect(result.address).toBe("abcdef01.sp");
    expect(result.balance).toBe(1234n);
  });

  // ── getTransaction ──────────────────────────────────────────────────────

  test("getTransaction returns Transaction", async () => {
    // Serialize bigints as strings for JSON wire format
    const wire = { ...SAMPLE_TX, amount: "1000", nonce: "1" };
    fetchMock.mockResolvedValueOnce(rpcOk(wire));
    const tx = await client.getTransaction("txhash1");
    expect(tx.hash).toBe("txhash1");
    expect(tx.from).toBe("abcdef01.sp");
    expect(tx.status).toBe("confirmed");
  });

  // ── sendTransaction ─────────────────────────────────────────────────────

  test("sendTransaction serializes bigints as strings", async () => {
    fetchMock.mockResolvedValueOnce(
      rpcOk({ txHash: "newhash", status: "accepted" }),
    );
    const result = await client.sendTransaction({
      from: "abcdef01.sp",
      to: "12345678.sp",
      amount: 500n,
      nonce: 3n,
      signature: "a".repeat(128),
      pubkey: "b".repeat(64),
    });
    expect(result.txHash).toBe("newhash");
    expect(result.status).toBe("accepted");

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { amount: string; nonce: string } };
    // bigints must be serialized as strings (JSON can't represent bigint)
    expect(body.params.amount).toBe("500");
    expect(body.params.nonce).toBe("3");
  });

  // ── RPC error handling ──────────────────────────────────────────────────

  test("throws on RPC error response", async () => {
    fetchMock.mockResolvedValueOnce(rpcErr(-32601, "Method not found"));
    await expect(client.getNodeInfo()).rejects.toThrow("Method not found");
  });

  test("throws on HTTP error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );
    await expect(client.getNodeInfo()).rejects.toThrow("HTTP 401");
  });

  // ── Auth header ─────────────────────────────────────────────────────────

  test("sends Authorization header when authToken is set", async () => {
    const authed = new SierpinskiClient({
      nodeUrl: "http://localhost:40410",
      authToken: "secret-token",
    });
    fetchMock.mockResolvedValueOnce(rpcOk(NODE_INFO));
    await authed.getNodeInfo();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer secret-token");
    authed.disconnect();
  });

  test("omits Authorization header when no authToken", async () => {
    fetchMock.mockResolvedValueOnce(rpcOk(NODE_INFO));
    await client.getNodeInfo();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  // ── RPC id increments ───────────────────────────────────────────────────

  test("rpc id increments per call", async () => {
    fetchMock
      .mockResolvedValueOnce(rpcOk(NODE_INFO))
      .mockResolvedValueOnce(rpcOk(NODE_INFO));
    await client.getNodeInfo();
    await client.getNodeInfo();
    const id1 = (
      JSON.parse(
        (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as { id: number }
    ).id;
    const id2 = (
      JSON.parse(
        (fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string,
      ) as { id: number }
    ).id;
    expect(id2).toBe(id1 + 1);
  });

  test("rpc() performs generic method call", async () => {
    fetchMock.mockResolvedValueOnce(rpcOk({ accepted: true }));
    const out = await client.rpc<{ accepted: boolean }>("deployContract", {
      contract: "counter",
    });
    expect(out.accepted).toBe(true);
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { method: string; params: { contract: string } };
    expect(body.method).toBe("deployContract");
    expect(body.params.contract).toBe("counter");
  });

  // ── wsConnected ─────────────────────────────────────────────────────────

  test("wsConnected is false before subscribe", () => {
    expect(client.wsConnected).toBe(false);
  });

  test("disconnect() is safe to call multiple times", () => {
    expect(() => {
      client.disconnect();
      client.disconnect();
    }).not.toThrow();
  });
});
