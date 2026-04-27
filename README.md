# @sierpinski/sdk

TypeScript SDK for Sierpinski RPC and WebSocket APIs.

## Install

```bash
npm install @sierpinski/sdk
```

## Quick Start

```ts
import { SierpinskiClient } from "@sierpinski/sdk";

const client = new SierpinskiClient({
  nodeUrl: "https://wallet.testnet.sierpinskichain.com",
  authToken: process.env.SIERPINSKI_RPC_TOKEN,
});

const info = await client.getNodeInfo();
console.log(info.blockHeight);
```

## React Hooks

```ts
import { useBalance } from "@sierpinski/sdk/hooks";
```

`react` is an optional peer dependency only needed when importing `@sierpinski/sdk/hooks`.

## Release Channels

- `next`: release candidates (`x.y.z-rc.n`)
- `latest`: stable public release

See `docs/sdk-public-release.md` for release process.
