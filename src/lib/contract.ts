/**
 * Contract configuration and a typed ethers.js client factory.
 *
 * The ABI here is kept in exact agreement with contracts/GoalStaker.sol —
 * same function signatures, same struct field order. Keeping all
 * chain-specific constants in one file means redeploying or switching
 * networks is a one-line change, not a hunt through the UI.
 */
import { BrowserProvider, Contract, JsonRpcSigner } from "ethers";
import { SEPOLIA_CHAIN_ID } from "./types";

/** Deployed GoalStaker on Ethereum Sepolia. */
export const CONTRACT_ADDRESS =
  "0xE88E8B7110a3B08d67397b2f727E1d3b8ED96Afc";

export const SEPOLIA_PARAMS = {
  chainId: "0xaa36a7", // 11155111 in hex
  chainName: "Ethereum Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
} as const;

export { SEPOLIA_CHAIN_ID };

/**
 * Minimal ABI — only the functions the frontend calls, matching the
 * Solidity source exactly. The getGoal tuple mirrors the Goal struct:
 * (staker, verifier, forfeitTo, amount, deadline, createdAt, status, description).
 */
export const GOAL_STAKER_ABI = [
  "function createGoal(address verifier, address forfeitTo, uint64 deadline, string description) payable returns (uint256)",
  "function verify(uint256 goalId)",
  "function markFailed(uint256 goalId)",
  "function cancelEarly(uint256 goalId)",
  "function resolveAfterGrace(uint256 goalId)",
  "function getGoal(uint256 goalId) view returns (tuple(address staker, address verifier, address forfeitTo, uint256 amount, uint64 deadline, uint64 createdAt, uint8 status, string description))",
  "function goalsOf(address user) view returns (uint256[])",
] as const;

/** Build a read/write contract instance bound to the connected signer. */
export function getContract(signer: JsonRpcSigner): Contract {
  return new Contract(CONTRACT_ADDRESS, GOAL_STAKER_ABI, signer);
}

/** Build a read-only contract instance bound to a provider. */
export function getReadContract(provider: BrowserProvider): Contract {
  return new Contract(CONTRACT_ADDRESS, GOAL_STAKER_ABI, provider);
}
