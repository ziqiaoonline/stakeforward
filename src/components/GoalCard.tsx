"use client";

import { formatEther } from "ethers";
import { Goal, GOAL_STATUS_LABEL, GoalStatus } from "@/lib/types";

const STATUS_CLASS: Record<GoalStatus, string> = {
  [GoalStatus.Active]: "active",
  [GoalStatus.Succeeded]: "succeeded",
  [GoalStatus.Failed]: "failed",
  [GoalStatus.Cancelled]: "cancelled",
};

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function GoalCard({ goal }: { goal: Goal }) {
  return (
    <article className="goal">
      <span className={`tag ${STATUS_CLASS[goal.status]}`}>
        {GOAL_STATUS_LABEL[goal.status]}
      </span>
      <h3>{goal.description || "Untitled goal"}</h3>
      <div className="meta">
        <span>Stake: {formatEther(goal.amount)} ETH</span>
        <span>Deadline: {formatDate(goal.deadline)}</span>
        <span>Verifier: {shorten(goal.verifier)}</span>
        <span>Forfeit to: {shorten(goal.forfeitTo)}</span>
        <span>Goal #{goal.id.toString()}</span>
      </div>
    </article>
  );
}
