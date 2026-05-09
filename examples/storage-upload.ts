import { StorageClient } from "@sierpinskichain/sdk/storage";

const NODE_URL = process.env.SIERPINSKI_RPC_URL ?? "http://127.0.0.1:40406";

async function main(): Promise<void> {
  const storage = new StorageClient({ nodeUrl: NODE_URL });
  const upload = await storage.uploadFile({
    data: "hello from sdk example",
    owner: "abcd1234.sp",
  });
  console.log("upload:", upload);

  const pin = await storage.pinFile({
    fileId: upload.fileId,
    owner: "abcd1234.sp",
  });
  console.log("pin:", pin);
}

void main();
