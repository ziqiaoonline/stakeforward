"use client";

import { useCallback, useEffect, useState } from "react";
import { Goal } from "@/lib/types";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { useWallet } from "@/lib/useWallet";
import { useGoals } from "@/lib/useGoals";
import { CreateGoalForm } from "@/components/CreateGoalForm";
import { VerifierPanel } from "@/components/VerifierPanel";
import { GoalCard } from "@/components/GoalCard";

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Home() {
  const wallet = useWallet();
  const { createGoal, callVerifierAction, fetchGoals, fetchGoalById, busy } =
    useGoals();
  const [myGoals, setMyGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  const refresh = useCallback(async () => {
    if (!wallet.address) {
      setMyGoals([]);
      return;
    }
    setLoadingGoals(true);
    try {
      setMyGoals(await fetchGoals(wallet.address));
    } finally {
      setLoadingGoals(false);
    }
  }, [wallet.address, fetchGoals]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = useCallback(
    async (input: Parameters<typeof createGoal>[0]) => {
      await createGoal(input);
      await refresh();
    },
    [createGoal, refresh]
  );

  const handleVerifierAction = useCallback(
    async (goalId: bigint, action: "verify" | "markFailed") => {
      await callVerifierAction(goalId, action);
      await refresh();
    },
    [callVerifierAction, refresh]
  );

  const connected = wallet.address !== null;

  return (
    <main className="wrap">
      <header className="masthead">
        <div className="kicker">An onchain commitment device · Ethereum Sepolia</div>
        <h1>StakeForward</h1>
        <p className="dek">
          Lock ETH against a goal that matters. Pick a verifier you trust. Get
          it back when you ship — or watch it go to your forfeit address if you
          don&apos;t.
        </p>
      </header>

      <div className="bar">
        <span className="addr">
          {connected
            ? `Connected · ${shorten(wallet.address!)}`
            : "Wallet not connected"}
        </span>
        <button
          className="btn"
          onClick={wallet.connect}
          disabled={wallet.isConnecting}
        >
          {wallet.isConnecting
            ? "Connecting…"
            : connected
              ? "Reconnect"
              : "Connect wallet"}
        </button>
      </div>

      {wallet.onWrongNetwork && (
        <div className="warn">
          Wrong network. This app runs on Ethereum Sepolia.{" "}
          <button
            className="btn ghost"
            style={{ marginLeft: 8 }}
            onClick={wallet.switchToSepolia}
          >
            Switch
          </button>
        </div>
      )}

      {wallet.error && <p className="err">{wallet.error}</p>}

      <section className="cols">
        <div>
          <CreateGoalForm
            disabled={!connected}
            busy={busy}
            onSubmit={handleCreate}
          />

          <div style={{ marginTop: 48 }}>
            <VerifierPanel
              disabled={!connected}
              busy={busy}
              onLookup={fetchGoalById}
              onAction={handleVerifierAction}
            />
          </div>
        </div>

        <div>
          <div className="section-label">Your goals</div>
          {!connected && (
            <p className="empty">Connect a wallet to see your goals.</p>
          )}
          {connected && loadingGoals && (
            <p className="empty">Loading…</p>
          )}
          {connected && !loadingGoals && myGoals.length === 0 && (
            <p className="empty">No goals yet. Lock your first stake.</p>
          )}
          {myGoals.map((goal) => (
            <GoalCard key={goal.id.toString()} goal={goal} />
          ))}
        </div>
      </section>

      <footer className="foot">
        Contract:{" "}
        <a
          href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          {CONTRACT_ADDRESS}
        </a>{" "}
        · No owner, no admin keys, no upgrade path · MIT
      </footer>
    </main>
  );
}
