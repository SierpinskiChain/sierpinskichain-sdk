import { SierpinskiClient } from "@sierpinskichain/sdk";

const NODE_URL = process.env.SIERPINSKI_RPC_URL ?? "http://127.0.0.1:40406";
const WS_URL = process.env.SIERPINSKI_WS_URL ?? "ws://127.0.0.1:40407/ws";

async function main(): Promise<void> {
  const client = new SierpinskiClient({
    nodeUrl: NODE_URL,
    wsUrl: WS_URL,
  });

  const unsubscribe = client.subscribe("transactions", (event) => {
    console.log("event:", event);
  });

  console.log("Subscribed to transactions. Ctrl+C to exit.");
  process.on("SIGINT", () => {
    unsubscribe();
    client.disconnect();
    process.exit(0);
  });
}

void main();
