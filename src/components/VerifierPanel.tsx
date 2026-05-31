"use client";

import { useState } from "react";
import { Goal } from "@/lib/types";
import { GoalCard } from "./GoalCard";

interface Props {
  disabled: boolean;
  busy: boolean;
  onLookup: (goalId: bigint) => Promise<Goal | null>;
  onAction: (goalId: bigint, action: "verify" | "markFailed") => Promise<void>;
}

export function VerifierPanel({ disabled, busy, onLookup, onAction }: Props) {
  const [goalIdInput, setGoalIdInput] = useState("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleLookup() {
    setNotFound(false);
    setGoal(null);
    const id = goalIdInput.trim();
    if (id === "") return;
    const found = await onLookup(BigInt(id));
    if (found) setGoal(found);
    else setNotFound(true);
  }

  return (
    <div>
      <div className="section-label">Acting as a verifier?</div>

      <div className="field">
        <label htmlFor="goalId">Goal ID</label>
        <input
          id="goalId"
          type="number"
          min="0"
          placeholder="e.g. 3"
          value={goalIdInput}
          onChange={(e) => setGoalIdInput(e.target.value)}
        />
      </div>

      <button className="btn ghost" onClick={handleLookup} disabled={disabled}>
        Look up goal
      </button>

      {notFound && <p className="err">No goal with that ID.</p>}

      {goal && (
        <div style={{ marginTop: 24 }}>
          <GoalCard goal={goal} />
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              className="btn"
              disabled={disabled || busy}
              onClick={() => onAction(goal.id, "verify")}
            >
              {busy ? "…" : "Verify"}
            </button>
            <button
              className="btn ghost"
              disabled={disabled || busy}
              onClick={() => onAction(goal.id, "markFailed")}
            >
              Mark failed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
