import { HdWallet } from "@sierpinskichain/sdk/wallet";

function main(): void {
  const wallet = HdWallet.create();
  console.log("address:", wallet.getAddress());
  console.log("mnemonic:", wallet.exportMnemonic());
}

main();
