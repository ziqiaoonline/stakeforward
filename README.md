# StakeForward

**An onchain commitment device for goals that matter.** Lock ETH against a goal,
pick a verifier you trust, and get it back when you ship — or forfeit it if you
don't.

Built with **TypeScript, React, and Next.js** on the front end, backed by a
**Solidity** smart contract with a full Hardhat test suite.

> **Live on Ethereum Sepolia** (Chain ID 11155111)
> Contract: [`0xE88E8B7110a3B08d67397b2f727E1d3b8ED96Afc`](https://sepolia.etherscan.io/address/0xE88E8B7110a3B08d67397b2f727E1d3b8ED96Afc)

---

## Engineering practices

The things this project was built to demonstrate, up front:

| Practice | How it shows up |
| --- | --- |
| **Type safety end-to-end** | Strict-mode TypeScript across the whole front end. Domain types live in one place (`src/lib/types.ts`) and the compiler enforces agreement between the contract interface, UI state, and wallet layer. `tsc --noEmit` passes with zero errors. |
| **Separation of concerns** | Wallet plumbing (`useWallet`) and contract calls (`useGoals`) are isolated in hooks. Components stay declarative and never touch ethers.js directly — the seam where blockchain logic becomes testable. |
| **Input validation before side effects** | The create-goal form validates addresses, stake, and deadline client-side, so obvious mistakes never become failed on-chain transactions. |
| **Tested contract, all paths covered** | The Hardhat/Chai suite covers every happy path, every access-control revert, and the timelock fallback. See `contracts/` and `test/`. |
| **Requirements → user stories** | Features trace back to documented user stories with acceptance criteria in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md). |
| **Production build verified** | `next build` compiles successfully and prerenders the app as static content. |

---

## Tech stack

**Front end:** Next.js 14 (App Router) · React 18 · TypeScript (strict) · ethers.js v6
**Contract:** Solidity · Hardhat · Chai
**Chain:** Ethereum Sepolia testnet

---

## How it works

A staker locks ETH against a goal with a deadline, a verifier, and a forfeit
address. The smart contract holds the stake — no admin, no owner, no upgrade
path. The only ways out are encoded in the contract:

```
                  createGoal (payable)
                          │
                          ▼
                     [ Active ]
                    /     │    \
          verify() /      │     \ markFailed()
                  ▼       │      ▼
          [Succeeded]     │   [Failed]
       stake → staker     │   stake → forfeitTo
                          │
        within 10 min ────┤──── after deadline + 14-day grace,
        cancelEarly()     │     if verifier never acted:
        stake → staker    │     resolveAfterGrace()
                          ▼     stake → forfeitTo
```

### Contract functions

| Function | Caller | Effect |
| --- | --- | --- |
| `createGoal(verifier, forfeitTo, deadline, description)` | anyone | Locks `msg.value` against a new goal. |
| `verify(goalId)` | verifier | Releases the stake to the staker. |
| `markFailed(goalId)` | verifier | Sends the stake to the forfeit address. |
| `cancelEarly(goalId)` | staker, ≤10 min after creation | Refunds the stake. |
| `resolveAfterGrace(goalId)` | anyone, ≥ deadline + 14 days | Sends the stake to the forfeit address. |
| `getGoal(goalId)` | anyone (view) | Returns the full goal struct. |
| `goalsOf(address)` | anyone (view) | Returns goal IDs created by that address. |

---

## Project layout

```
stakeforward/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← root layout + metadata
│   │   ├── page.tsx            ← main page, composes the app
│   │   └── globals.css         ← editorial typographic design
│   ├── components/
│   │   ├── CreateGoalForm.tsx  ← goal creation + client-side validation
│   │   ├── VerifierPanel.tsx   ← verifier lookup + verify/markFailed
│   │   └── GoalCard.tsx        ← single goal display
│   └── lib/
│       ├── types.ts            ← single source of truth for domain types
│       ├── contract.ts         ← address, ABI, typed contract factory
│       ├── useWallet.ts        ← wallet connect + network switching
│       └── useGoals.ts         ← typed contract interactions
├── contracts/
│   └── GoalStaker.sol          ← the core contract (no owner, no admin)
├── test/
│   └── GoalStaker.test.js      ← Hardhat/Chai suite, all paths covered
├── scripts/
│   └── deploy.js               ← deploy + print address
├── docs/
│   └── REQUIREMENTS.md         ← user stories + acceptance criteria
├── hardhat.config.js
└── package.json
```

---

## Run it locally

**Prerequisites:** Node.js ≥ 20, a wallet (MetaMask / Rabby), and a little
Sepolia ETH from a faucet.

```bash
git clone https://github.com/ziqiaoonline/stakeforward.git
cd stakeforward
npm install

npm run dev        # start the Next.js dev server → http://localhost:3000
npm run typecheck  # tsc --noEmit, strict mode
npm run build      # production build
```

Connect your wallet, switch to Ethereum Sepolia (the app prompts you if you're
on the wrong network), and create your first goal.

### Contract development

```bash
npx hardhat test                                    # run the full suite
npx hardhat run scripts/deploy.js --network sepolia # deploy
```

---

## Design decisions

| Decision | Rationale |
| --- | --- |
| No owner, no admin keys | Trust comes from the code, not the deployer. |
| 10-minute cancellation window | Lets users fix a typo without weakening the commitment. |
| 14-day grace + open `resolveAfterGrace` | Prevents permanent fund lockup if a verifier vanishes; funds always go to `forfeitTo`. |
| Custom errors over require strings | ~50% gas savings on reverts (EIP-838). |
| Checks-effects-interactions on payouts | Reentrancy-safe without an external guard dependency. |
| `goalsOf(address)` index | Enables the "your goals" view with no backend database. |

---

## Why this needs a smart contract

The product only works because the commitment is *irreversible*. A commitment
device with an undo button isn't a commitment device. A bank escrow, a friend
holding cash, or a SaaS app with a refund button are all reversible by phone
call or social pressure. A smart contract isn't — and the verifier role is
enforced by code, not policy. There's no admin who can step in and reverse an
outcome.

---

## Status & limitations

- Testnet only. **Not audited.** Don't use it with funds you can't lose.
- No partial-completion model — a goal is either succeeded or failed.
- Single verifier only (no m-of-n).

## What I'd build next

- **Verifier reputation** aggregated from the existing event log — no contract
  changes needed.
- **Multi-verifier (m-of-n)** sign-off for team goals.
- **EAS attestations** on every successful verification, turning completed
  goals into portable, verifiable credentials.

---

## License

MIT.
