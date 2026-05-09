import { AiClient } from "@sierpinskichain/sdk/ai";

const NODE_URL = process.env.SIERPINSKI_RPC_URL ?? "http://127.0.0.1:40406";

async function main(): Promise<void> {
  const ai = new AiClient({ nodeUrl: NODE_URL });

  const fraud = await ai.getFraudScore("abcd1234.sp");
  console.log("fraud:", fraud);

  const infer = await ai.infer({
    model: "tiny",
    prompt: "Summarize Sierpinski in one sentence.",
    maxTokens: 64,
  });
  console.log("infer:", infer);
}

void main();
