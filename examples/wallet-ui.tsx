import React, { useMemo, useState } from "react";
import {
  WalletPanel,
  createGeneratedWallet,
  createWalletFromMnemonic,
  type WalletActivity,
  type WalletRecord,
} from "@sierpinskichain/sdk/wallet-ui";

function WalletUiExample(): React.JSX.Element {
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [activity, setActivity] = useState<WalletActivity[]>([]);

  const activeWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === activeWalletId) ?? null,
    [wallets, activeWalletId],
  );

  const onCreateWallet = (name?: string): void => {
    const next = createGeneratedWallet(name || `Wallet ${wallets.length + 1}`);
    setWallets((prev) => [...prev, next]);
    setActiveWalletId(next.id);
  };

  const onImportWallet = (mnemonic: string, name?: string): void => {
    const next = createWalletFromMnemonic(name || "Imported Wallet", mnemonic);
    if (!next) return;
    setWallets((prev) => [...prev, next]);
    setActiveWalletId(next.id);
  };

  const onSend = (to: string, amount: string): void => {
    if (!activeWallet) return;
    const sender = activeWallet.accounts[activeWallet.activeAccountIndex]?.address ?? "";
    const hash = `demo-${Date.now()}`;
    const now = Date.now();
    setActivity((prev) => [
      {
        hash,
        kind: "send",
        amount,
        status: "pending",
        timestamp: now,
      },
      ...prev,
    ]);
    setTimeout(() => {
      setActivity((prev) =>
        prev.map((entry) =>
          entry.hash === hash
            ? {
                ...entry,
                status: "confirmed",
              }
            : entry,
        ),
      );
      setActivity((prev) => [
        {
          hash: `${hash}-receive`,
          kind: "receive",
          amount,
          status: "confirmed",
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      console.log(`demo send confirmed: ${sender} -> ${to} (${amount})`);
    }, 800);
  };

  return (
    <WalletPanel
      wallets={wallets}
      activeWalletId={activeWalletId}
      activity={activity}
      onCreateWallet={onCreateWallet}
      onImportWallet={onImportWallet}
      onSelectWallet={setActiveWalletId}
      onSend={onSend}
    />
  );
}

export default WalletUiExample;
