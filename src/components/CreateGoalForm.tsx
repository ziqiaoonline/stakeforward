"use client";

import { useState } from "react";
import { isAddress } from "ethers";
import { CreateGoalInput } from "@/lib/types";

interface Props {
  disabled: boolean;
  busy: boolean;
  onSubmit: (input: CreateGoalInput) => Promise<void>;
}

const DEFAULT_DAYS_OUT = 7;

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_DAYS_OUT);
  return d.toISOString().slice(0, 10);
}

export function CreateGoalForm({ disabled, busy, onSubmit }: Props) {
  const [description, setDescription] = useState("");
  const [stakeEth, setStakeEth] = useState("0.001");
  const [verifier, setVerifier] = useState("");
  const [forfeitTo, setForfeitTo] = useState("");
  const [deadlineDate, setDeadlineDate] = useState(defaultDeadline());
  const [validationError, setValidationError] = useState<string | null>(null);

  // Client-side validation keeps obvious mistakes off-chain (saves gas + UX).
  function validate(): string | null {
    if (!description.trim()) return "Describe the goal.";
    if (Number(stakeEth) <= 0) return "Stake must be greater than zero.";
    if (!isAddress(verifier)) return "Verifier must be a valid address.";
    if (!isAddress(forfeitTo)) return "Forfeit address must be valid.";
    const deadline = Math.floor(new Date(deadlineDate).getTime() / 1000);
    if (deadline <= Math.floor(Date.now() / 1000))
      return "Deadline must be in the future.";
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    await onSubmit({
      description: description.trim(),
      stakeEth,
      verifier,
      forfeitTo,
      deadline: Math.floor(new Date(deadlineDate).getTime() / 1000),
    });
    setDescription("");
  }

  return (
    <div>
      <div className="section-label">Lock a stake</div>

      <div className="field">
        <label htmlFor="desc">The goal</label>
        <textarea
          id="desc"
          placeholder="Ship the v2 release by Friday"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="stake">Stake (ETH)</label>
        <input
          id="stake"
          type="number"
          step="0.0001"
          min="0"
          value={stakeEth}
          onChange={(e) => setStakeEth(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="deadline">Deadline</label>
        <input
          id="deadline"
          type="date"
          value={deadlineDate}
          onChange={(e) => setDeadlineDate(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="verifier">Verifier address</label>
        <input
          id="verifier"
          placeholder="0x…"
          value={verifier}
          onChange={(e) => setVerifier(e.target.value)}
        />
        <p className="hint">
          Someone you trust. Only they can confirm you delivered.
        </p>
      </div>

      <div className="field">
        <label htmlFor="forfeit">Forfeit address</label>
        <input
          id="forfeit"
          placeholder="0x…"
          value={forfeitTo}
          onChange={(e) => setForfeitTo(e.target.value)}
        />
        <p className="hint">
          Where the stake goes if you miss the deadline (a charity, a friend).
        </p>
      </div>

      <button
        className="btn"
        onClick={handleSubmit}
        disabled={disabled || busy}
      >
        {busy ? "Confirming…" : "Sign to lock stake"}
      </button>

      {validationError && <p className="err">{validationError}</p>}
    </div>
  );
}
