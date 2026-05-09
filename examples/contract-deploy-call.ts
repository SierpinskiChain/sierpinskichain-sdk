import { ContractClient } from "@sierpinskichain/sdk/contract";

const NODE_URL = process.env.SIERPINSKI_RPC_URL ?? "http://127.0.0.1:40406";

async function main(): Promise<void> {
  const contracts = new ContractClient({ nodeUrl: NODE_URL });

  const deploy = await contracts.deploy({
    contract: "counter-demo",
    key: "value",
    value: "0",
  });
  console.log("deploy:", deploy);

  const call = await contracts.call({
    contract: "counter-demo",
    key: "value",
    value: "1",
  });
  console.log("call:", call);

  const query = await contracts.query({
    contract: "counter-demo",
    key: "value",
  });
  console.log("query:", query);
}

void main();
