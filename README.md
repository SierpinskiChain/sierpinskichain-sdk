# @sierpinskichain/sdk

TypeScript SDK for Sierpinski RPC and WebSocket APIs.

## Install

```bash
npm install @sierpinskichain/sdk
```

## Quick Start

```ts
import { SierpinskiClient } from "@sierpinskichain/sdk";

const client = new SierpinskiClient({
  nodeUrl: "https://wallet.testnet.sierpinskichain.com",
  authToken: process.env.SIERPINSKI_RPC_TOKEN,
});

const info = await client.getNodeInfo();
console.log(info.blockHeight);
```

## React Hooks

```ts
import { useBalance } from "@sierpinskichain/sdk/hooks";
```

`react` is an optional peer dependency only needed when importing `@sierpinskichain/sdk/hooks`.

## Umbrella Subpath Imports

Install only the SDK package and import feature surfaces via subpaths:

```ts
import { HdWallet } from "@sierpinskichain/sdk/wallet";
import { ContractClient } from "@sierpinskichain/sdk/contract";
import { StorageClient } from "@sierpinskichain/sdk/storage";
import { AiClient } from "@sierpinskichain/sdk/ai";
import { WalletPanel } from "@sierpinskichain/sdk/wallet-ui";
```

## Release Channels

- `next`: release candidates (`x.y.z-rc.n`)
- `latest`: stable public release

See `docs/sdk-public-release.md` for release process.

## Published Examples

The npm package includes runnable examples under:

- `examples/`
- `examples/wallet-ui.tsx` for `WalletPanel` integration
