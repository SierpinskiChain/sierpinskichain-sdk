/**
 * Fund a wallet with testnet SPC via the faucet.
 * Usage: bun run ts/examples/fund-wallet.ts [address]
 */
import { SierpinskiClient } from "@sierpinskichain/sdk";
import { HdWallet } from "@sierpinskichain/sdk/wallet";

const RPC_URL = "https://rpc1.testnet.sierpinskichain.com";

async function main() {
  const args = process.argv.slice(2);
  let wallet: HdWallet;
  let address: string;

  if (args.length > 0 && args[0].endsWith(".sp")) {
    // Fund an existing address
    address = args[0];
    console.log(`Funding existing address: ${address}`);
  } else {
    // Generate new wallet
    wallet = HdWallet.generate();
    address = wallet.address(0);
    console.log("Generated new wallet:");
    console.log(`  Address:  ${address}`);
    console.log(`  Mnemonic: ${wallet.mnemonic}`);
    console.log("");
  }

  const client = new SierpinskiClient({ nodeUrl: RPC_URL });

  // Request faucet
  console.log("Requesting faucet...");
  try {
    await client.rpc("requestFaucet", { address, amount: 10_000_000 });
  } catch (err) {
    console.error("Faucet failed:", err instanceof Error ? err.message : err);
    // Try with different param format
    try {
      await client.rpc("requestFaucet", { address, amount: "10000000" });
    } catch (err2) {
      console.error("Faucet retry also failed:", err2 instanceof Error ? err2.message : err2);
      process.exit(1);
    }
  }

  // Check balance
  console.log("Checking balance...");
  const balance = await client.getBalance(address);
  console.log(`  Balance: ${balance.atomic} atomic SPC (${balance.spc} SPC)`);
}

main().catch(console.error);
