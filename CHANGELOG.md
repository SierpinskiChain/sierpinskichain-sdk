# Changelog

All notable changes to `@sierpinskichain/sdk` are documented in this file.

## 0.1.2-next.0 - 2026-04-29

### Highlights
- Added umbrella SDK package surface so developers can install a single package and import all major client APIs.
- Introduced feature subpath exports:
  - `@sierpinskichain/sdk/wallet`
  - `@sierpinskichain/sdk/contract`
  - `@sierpinskichain/sdk/storage`
  - `@sierpinskichain/sdk/ai`
- Added root-level convenience exports from `@sierpinskichain/sdk`:
  - `HdWallet`
  - `ContractClient`
  - `StorageClient`
  - `AiClient`

### Developer Experience
- `create-sierpinski-app` scaffold now defaults to single-package onboarding (`@sierpinskichain/sdk`) and SDK subpath imports.
- Examples updated to use `@sierpinskichain/sdk` and SDK subpaths.
- Release runbook updated with package surface guidance.
- Added publish helper script:
  - `ops/testnet-v1/scripts/publish_sdk_release.sh`

### Validation
- SDK tests passed.
- SDK typecheck passed.
- SDK build passed.
- Scaffolder tests passed.

### Notes
- This is a `next` channel prerelease for validation before `latest`.
- No breaking changes intended for existing `@sierpinskichain/sdk` core client imports.
