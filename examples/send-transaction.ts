import { SierpinskiClient } from "@sierpinskichain/sdk";
import { HdWallet } from "@sierpinskichain/sdk/wallet";

const NODE_URL = process.env.SIERPINSKI_RPC_URL ?? "http://127.0.0.1:40406";

async function main(): Promise<void> {
  const client = new SierpinskiClient({ nodeUrl: NODE_URL });
  const wallet = HdWallet.create();

  const to = "12345678.sp";
  const amount = 1_000n;
  const tx = wallet.signTx({
    to,
    amount,
    nonce: 1n,
  });

  const result = await client.sendTransaction(tx);
  console.log("sendTransaction:", result);
}

void main();
