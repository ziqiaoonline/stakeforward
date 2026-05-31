"use client";

/**
 * useGoals — wraps every GoalStaker contract interaction in a typed,
 * error-handled method. Components call these; they never touch ethers
 * directly. This is the seam where blockchain calls become testable.
 */
import { useCallback, useState } from "react";
import { parseEther } from "ethers";
import { getContract, getReadContract } from "@/lib/contract";
import { CreateGoalInput, Goal, GoalStatus } from "@/lib/types";
import { useWallet } from "@/lib/useWallet";

/**
 * The raw tuple shape returned by getGoal(). The contract's Goal struct has
 * no id field, so the id is supplied separately by the caller (from goalsOf
 * or a direct lookup).
 */
interface RawGoal {
  staker: string;
  verifier: string;
  forfeitTo: string;
  amount: bigint;
  deadline: bigint;
  createdAt: bigint;
  status: bigint;
  description: string;
}

/** Normalize a raw getGoal() tuple into our typed Goal. */
function toGoal(id: bigint, raw: RawGoal): Goal {
  return {
    id,
    staker: raw.staker,
    verifier: raw.verifier,
    forfeitTo: raw.forfeitTo,
    amount: raw.amount,
    deadline: Number(raw.deadline),
    createdAt: Number(raw.createdAt),
    status: Number(raw.status) as GoalStatus,
    description: raw.description,
  };
}

export function useGoals() {
  const { getSigner, getProvider } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGoal = useCallback(
    async (input: CreateGoalInput): Promise<void> => {
      setBusy(true);
      setError(null);
      try {
        const signer = await getSigner();
        if (!signer) throw new Error("Connect a wallet first.");
        const contract = getContract(signer);
        const tx = await contract.createGoal(
          input.verifier,
          input.forfeitTo,
          input.deadline,
          input.description,
          { value: parseEther(input.stakeEth) }
        );
        await tx.wait();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transaction failed.");
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [getSigner]
  );

  const callVerifierAction = useCallback(
    async (goalId: bigint, action: "verify" | "markFailed"): Promise<void> => {
      setBusy(true);
      setError(null);
      try {
        const signer = await getSigner();
        if (!signer) throw new Error("Connect a wallet first.");
        const contract = getContract(signer);
        const tx = await contract[action](goalId);
        await tx.wait();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transaction failed.");
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [getSigner]
  );

  const fetchGoals = useCallback(
    async (owner: string): Promise<Goal[]> => {
      const provider = getProvider();
      if (!provider) return [];
      const contract = getReadContract(provider);
      const ids = (await contract.goalsOf(owner)) as bigint[];
      const goals = await Promise.all(
        ids.map(async (id) => toGoal(id, (await contract.getGoal(id)) as RawGoal))
      );
      return goals;
    },
    [getProvider]
  );

  const fetchGoalById = useCallback(
    async (goalId: bigint): Promise<Goal | null> => {
      const provider = getProvider();
      if (!provider) return null;
      const contract = getReadContract(provider);
      try {
        return toGoal(goalId, (await contract.getGoal(goalId)) as RawGoal);
      } catch {
        return null;
      }
    },
    [getProvider]
  );

  return { createGoal, callVerifierAction, fetchGoals, fetchGoalById, busy, error };
}
