"use strict";
/**
 * KYC utilities — resolve compliance status for a Sierpinski address.
 *
 * Usage:
 *   import { resolveKyc } from "@sierpinskichain/sdk/kyc";
 *   const info = await resolveKyc(client, "user.sp");
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveKyc = resolveKyc;
exports.meetsKyc = meetsKyc;
/** Fetch on-chain compliance/KYC status for an address. */
async function resolveKyc(client, address) {
    try {
        const raw = await client.rpc("getCompliance", { address });
        if (!raw)
            return null;
        return {
            address: raw.address ?? address,
            kyc: raw.kyc ?? "None",
            jurisdiction: raw.jurisdiction ?? "Unknown",
            frozen: raw.frozen ?? false,
            dailyLimit: raw.daily_limit ?? 0,
            dailyUsed: raw.daily_used ?? 0,
        };
    }
    catch {
        return null;
    }
}
const KYC_LEVELS = { None: 0, Standard: 1, Enhanced: 2 };
/** Quick check: does the address have at least the given KYC level? */
async function meetsKyc(client, address, minLevel) {
    const info = await resolveKyc(client, address);
    if (!info || info.frozen)
        return false;
    return (KYC_LEVELS[info.kyc] ?? 0) >= (KYC_LEVELS[minLevel] ?? 0);
}
//# sourceMappingURL=kyc.js.map