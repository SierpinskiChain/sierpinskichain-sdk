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
export async function resolveKyc(
  client: SierpinskiClient,
  address: string,
): Promise<KycInfo | null> {
  try {
    const raw = await client.rpc<Record<string, unknown>>("getCompliance", { address });
    if (!raw) return null;
    return {
      address: (raw.address as string) ?? address,
      kyc: (raw.kyc as KycInfo["kyc"]) ?? "None",
      jurisdiction: (raw.jurisdiction as string) ?? "Unknown",
      frozen: (raw.frozen as boolean) ?? false,
      dailyLimit: (raw.daily_limit as number) ?? 0,
      dailyUsed: (raw.daily_used as number) ?? 0,
    };
  } catch {
    return null;
  }
}

const KYC_LEVELS: Record<string, number> = { None: 0, Standard: 1, Enhanced: 2 };

/** Quick check: does the address have at least the given KYC level? */
export async function meetsKyc(
  client: SierpinskiClient,
  address: string,
  minLevel: "Standard" | "Enhanced",
): Promise<boolean> {
  const info = await resolveKyc(client, address);
  if (!info || info.frozen) return false;
  return (KYC_LEVELS[info.kyc] ?? 0) >= (KYC_LEVELS[minLevel] ?? 0);
}
