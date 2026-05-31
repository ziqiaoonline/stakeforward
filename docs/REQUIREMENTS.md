# Requirements & User Stories

This document captures the requirements that drove StakeForward's design,
written in the format used in requirements-engineering practice: user stories
with explicit acceptance criteria. It exists so a reviewer can trace every
feature in the codebase back to a stated need.

---

## Personas

- **Staker** — the person committing to a goal and locking ETH against it.
- **Verifier** — a trusted third party who confirms whether the goal was met.
- **Forfeit recipient** — the address that receives the stake on failure
  (often a charity the staker would rather not fund).

---

## User stories

### US-1 — Commit to a goal

> As a **staker**, I want to lock ETH against a goal with a deadline and a
> chosen verifier, so that I have real financial stakes behind following
> through.

**Acceptance criteria**
- The stake amount, deadline, verifier, and forfeit address are all set at
  creation time and cannot be changed afterward.
- The deadline must be in the future; the form rejects past dates before any
  transaction is sent.
- The locked ETH is held by the contract, not by any person or admin.

### US-2 — Confirm a delivered goal

> As a **verifier**, I want to confirm that a staker delivered, so that their
> stake is returned to them.

**Acceptance criteria**
- Only the address designated as verifier can call `verify`.
- On verification, the full stake returns to the staker.
- The action is a single on-chain transaction with no further approvals.

### US-3 — Record a missed goal

> As a **verifier**, I want to mark a goal as failed, so that the stake goes to
> the forfeit address as agreed.

**Acceptance criteria**
- Only the verifier can call `markFailed`.
- On failure, the full stake transfers to the forfeit address — never to the
  verifier or the contract deployer.

### US-4 — Fix a mistake right after creating

> As a **staker**, I want a short window to cancel a goal I just created, so
> that a typo in the verifier or forfeit address isn't permanent.

**Acceptance criteria**
- Cancellation is allowed only within 10 minutes of creation.
- On cancellation, the stake is refunded to the staker.
- After the window closes, the goal is binding.

### US-5 — Recover funds if the verifier disappears

> As a **staker** (or anyone), I want a fallback that resolves a goal whose
> verifier never acted, so that funds are never permanently stuck.

**Acceptance criteria**
- After the deadline plus a 14-day grace period, anyone may call
  `resolveAfterGrace`.
- The stake always goes to the forfeit address — the caller gains nothing.

### US-6 — See my track record

> As a **staker**, I want to see all the goals I've created and their outcomes,
> so that my history is visible to me and to anyone evaluating me.

**Acceptance criteria**
- The app lists every goal created by the connected address, with status.
- History is read directly from the chain — no backend database required.

### US-7 — Be guided onto the right network

> As any **user**, I want the app to detect the wrong network and offer to
> switch, so that I don't send transactions to the wrong chain.

**Acceptance criteria**
- The app detects when the wallet is not on Ethereum Sepolia.
- It surfaces a one-click prompt to switch (or add) the network.

---

## Out of scope (documented intentionally)

- **Partial completion.** A goal is either succeeded or failed; there is no
  graduated 0–100% outcome. Noted as future work.
- **Multi-verifier (m-of-n).** Single verifier only in this version.
- **Mainnet deployment.** Testnet only; not audited.
