/**
 * KYC utilities — resolve compliance status for a Sierpinski address.
 *
 * Usage:
 *   import { resolveKyc } from "@sierpinskichain/sdk/kyc";
 *   const info = await resolveKyc(client, "user.sp");
 */
import type { SierpinskiClient } from "./client.js";
export interface KycInfo {
    address: string;
    kyc: "None" | "Standard" | "Enhanced";
    jurisdiction: string;
    frozen: boolean;
    dailyLimit: number;
    dailyUsed: number;
}
/** Fetch on-chain compliance/KYC status for an address. */
export declare function resolveKyc(client: SierpinskiClient, address: string): Promise<KycInfo | null>;
/** Quick check: does the address have at least the given KYC level? */
export declare function meetsKyc(client: SierpinskiClient, address: string, minLevel: "Standard" | "Enhanced"): Promise<boolean>;
//# sourceMappingURL=kyc.d.ts.map