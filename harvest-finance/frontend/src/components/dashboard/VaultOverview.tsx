"use client";

import React, { useEffect, useState } from "react";
import { VaultCard, VaultProps } from "./VaultCard";
import { loadVaultsCache, saveVaultsCache } from "@/lib/offline/db";
import { vaultIconFor } from "@/lib/offline/vault-icons";
import { DASHBOARD_DEFAULT_VAULTS } from "@/lib/dashboard/default-vaults";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";

function toCardProps(
  row: (typeof DASHBOARD_DEFAULT_VAULTS)[number],
): Omit<VaultProps, "onDeposit" | "onWithdraw"> {
  return {
    id: row.id,
    name: row.name,
    asset: row.asset,
    apy: row.apy,
    tvl: row.tvl,
    balance: row.balance,
    walletBalance: row.walletBalance,
    icon: vaultIconFor(row.iconKey),
  };
}

export function VaultOverview() {
  const [vaultRows, setVaultRows] = useState(DASHBOARD_DEFAULT_VAULTS);
  const [selectedVault, setSelectedVault] = useState<VaultProps | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const cached = await loadVaultsCache();
      if (cached?.length) {
        setVaultRows(cached);
      } else {
        await saveVaultsCache(DASHBOARD_DEFAULT_VAULTS);
      }
    })();
  }, []);

  function handleDeposit(vaultId: string) {
    const row = vaultRows.find((v) => v.id === vaultId);
    if (!row) return;
    setSelectedVault({
      ...toCardProps(row),
      onDeposit: handleDeposit,
      onWithdraw: handleWithdraw,
    });
    setDepositOpen(true);
  }

  function handleWithdraw(vaultId: string) {
    const row = vaultRows.find((v) => v.id === vaultId);
    if (!row) return;
    setSelectedVault({
      ...toCardProps(row),
      onDeposit: handleDeposit,
      onWithdraw: handleWithdraw,
    });
    setWithdrawOpen(true);
  }

  return (
    <section className="touch-manipulation">
      <div className="mb-5 md:mb-6">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Active Vaults
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Balances and vaults saved on this device for offline viewing.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4 md:gap-6">
        {vaultRows.map((row) => (
          <VaultCard
            key={row.id}
            {...toCardProps(row)}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
          />
        ))}
      </div>

      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        vault={selectedVault}
        onSuccess={() => {}}
      />
      <WithdrawModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        vault={selectedVault}
        onSuccess={() => {}}
      />
    </section>
  );
}
