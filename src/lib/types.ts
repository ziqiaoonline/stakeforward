/**
 * Shared domain types for StakeForward.
 *
 * These types are kept in exact agreement with the Goal struct in
 * contracts/GoalStaker.sol, so the contract interface, the UI state, and
 * the wallet layer all share one source of truth the compiler enforces.
 */

/** On-chain lifecycle state of a goal. Mirrors the enum in GoalStaker.sol. */
export enum GoalStatus {
  Active = 0,
  Succeeded = 1,
  Failed = 2,
  Cancelled = 3,
}

/** Human-readable labels for each status, used in the UI. */
export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  [GoalStatus.Active]: "Active",
  [GoalStatus.Succeeded]: "Succeeded",
  [GoalStatus.Failed]: "Failed",
  [GoalStatus.Cancelled]: "Cancelled",
};

/**
 * A goal as returned by the contract's getGoal(goalId) view, plus the id
 * (which the contract tracks via goalsOf, not inside the struct).
 * Wei amounts are kept as bigint to avoid precision loss.
 */
export interface Goal {
  id: bigint; // not part of the struct; supplied by the caller from goalsOf
  staker: string;
  verifier: string;
  forfeitTo: string;
  amount: bigint; // stake in wei
  deadline: number; // unix seconds
  createdAt: number; // unix seconds
  status: GoalStatus;
  description: string;
}

/** Form payload collected from the UI before a createGoal transaction. */
export interface CreateGoalInput {
  verifier: string;
  forfeitTo: string;
  deadline: number; // unix seconds
  description: string;
  stakeEth: string; // user-entered, parsed to wei at submit time
}

/** Connection state of the injected wallet (MetaMask / Rabby / etc.). */
export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
}

/** The Ethereum Sepolia testnet this app targets. */
export const SEPOLIA_CHAIN_ID = 11155111;
