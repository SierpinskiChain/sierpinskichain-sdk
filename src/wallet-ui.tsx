import React, { useMemo, useState } from "react";
import { HdWallet } from "@sierpinskichain/sdk/wallet";

export type WalletAccount = { index: number; address: string };
export type WalletRecord = {
  id: string;
  name: string;
  mnemonic: string;
  accounts: WalletAccount[];
  activeAccountIndex: number;
  createdAt: number;
};

export type WalletActivity = {
  hash: string;
  kind: "send" | "receive";
  amount: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
};

export type WalletPanelProps = {
  wallets: WalletRecord[];
  activeWalletId: string | null;
  activity: WalletActivity[];
  onCreateWallet: (name?: string) => void;
  onImportWallet: (mnemonic: string, name?: string) => void;
  onSelectWallet: (walletId: string) => void;
  onSend: (to: string, amount: string) => void;
};

export function validateMnemonicPhrase(phrase: string): string[] | null {
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  if (words.length !== 16) return null;
  return HdWallet.fromMnemonic(words) ? words : null;
}

export function createGeneratedWallet(name = "Wallet 1"): WalletRecord {
  const wallet = HdWallet.generate();
  return {
    id: crypto.randomUUID(),
    name,
    mnemonic: wallet.mnemonic,
    accounts: [{ index: 0, address: wallet.address(0) }],
    activeAccountIndex: 0,
    createdAt: Date.now(),
  };
}

export function createWalletFromMnemonic(name: string, phrase: string): WalletRecord | null {
  const words = validateMnemonicPhrase(phrase);
  if (!words) return null;
  const wallet = HdWallet.fromMnemonic(words);
  if (!wallet) return null;
  return {
    id: crypto.randomUUID(),
    name,
    mnemonic: wallet.mnemonic,
    accounts: [{ index: 0, address: wallet.address(0) }],
    activeAccountIndex: 0,
    createdAt: Date.now(),
  };
}

export function WalletPanel(props: WalletPanelProps) {
  const active = useMemo(
    () => props.wallets.find((wallet) => wallet.id === props.activeWalletId) ?? null,
    [props.wallets, props.activeWalletId],
  );
  const [draftTo, setDraftTo] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [importText, setImportText] = useState("");
  const [revealBackup, setRevealBackup] = useState(false);

  const maskedMnemonic = useMemo(() => {
    if (!active) return "";
    const words = active.mnemonic.split(/\s+/);
    return `${words.slice(0, 2).join(" ")} •••• ${words.slice(-2).join(" ")}`;
  }, [active]);

  return (
    <section className="src-wallet-panel">
      <header className="src-wallet-header">
        <h2>Connect Wallet</h2>
        <p>Mnemonic-first wallet UX for Sierpinski testnet.</p>
      </header>

      <div className="src-wallet-grid">
        <article className="src-wallet-card">
          <h3>Accounts</h3>
          <button type="button" onClick={() => props.onCreateWallet("Wallet")}>Create Wallet</button>
          <textarea
            placeholder="Paste 16-word mnemonic"
            value={importText}
            onChange={(event) => setImportText(event.currentTarget.value)}
          />
          <button type="button" onClick={() => props.onImportWallet(importText, "Imported Wallet")}>Import Wallet</button>
          <ul>
            {props.wallets.map((wallet) => (
              <li key={wallet.id}>
                <button type="button" onClick={() => props.onSelectWallet(wallet.id)}>
                  {wallet.name} · {wallet.accounts[wallet.activeAccountIndex]?.address ?? "-"}
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="src-wallet-card">
          <h3>Send</h3>
          <input placeholder="Recipient .sp address" value={draftTo} onChange={(e) => setDraftTo(e.currentTarget.value)} />
          <input placeholder="Amount" value={draftAmount} onChange={(e) => setDraftAmount(e.currentTarget.value)} />
          <button type="button" onClick={() => props.onSend(draftTo, draftAmount)}>Send</button>
          <h3>Receive</h3>
          <p>{active?.accounts[active.activeAccountIndex]?.address ?? "No active wallet"}</p>
        </article>

        <article className="src-wallet-card">
          <h3>Mnemonic Backup Center</h3>
          <p>{revealBackup ? active?.mnemonic ?? "No active wallet" : maskedMnemonic || "No active wallet"}</p>
          <button type="button" onClick={() => setRevealBackup((value) => !value)}>
            {revealBackup ? "Hide Recovery Phrase" : "Reveal Recovery Phrase"}
          </button>
          <p>Store your phrase offline. Anyone with it controls your funds.</p>
        </article>

        <article className="src-wallet-card">
          <h3>Activity</h3>
          <ul>
            {props.activity.map((item) => (
              <li key={item.hash}>{item.kind} {item.amount} · {item.status}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
