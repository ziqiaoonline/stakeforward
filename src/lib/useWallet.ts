"use client";

/**
 * useWallet — encapsulates injected-wallet connection, network detection,
 * and the "switch to Sepolia" flow behind a single typed hook.
 *
 * Keeping this logic out of the components means the UI stays declarative
 * and the wallet plumbing is unit-testable in isolation.
 */
import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { SEPOLIA_CHAIN_ID, WalletState } from "@/lib/types";
import { SEPOLIA_PARAMS } from "@/lib/contract";

// Minimal shape of the EIP-1193 provider we rely on.
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const INITIAL: WalletState = {
  address: null,
  chainId: null,
  isConnecting: false,
  error: null,
};

export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL);

  const getProvider = useCallback((): BrowserProvider | null => {
    if (typeof window === "undefined" || !window.ethereum) return null;
    return new BrowserProvider(window.ethereum);
  }, []);

  const getSigner = useCallback(async (): Promise<JsonRpcSigner | null> => {
    const provider = getProvider();
    if (!provider) return null;
    return provider.getSigner();
  }, [getProvider]);

  /** Prompt the wallet to add/switch to Ethereum Sepolia. */
  const switchToSepolia = useCallback(async (): Promise<void> => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_PARAMS.chainId }],
      });
    } catch (err) {
      // 4902 = chain not added yet; add it, then it becomes selectable.
      if ((err as { code?: number }).code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [SEPOLIA_PARAMS],
        });
      } else {
        throw err;
      }
    }
  }, []);

  const connect = useCallback(async (): Promise<void> => {
    const provider = getProvider();
    if (!provider) {
      setState((s) => ({
        ...s,
        error: "No wallet found. Install MetaMask or Rabby to continue.",
      }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const accounts = (await provider.send(
        "eth_requestAccounts",
        []
      )) as string[];
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      if (chainId !== SEPOLIA_CHAIN_ID) {
        await switchToSepolia();
      }

      setState({
        address: accounts[0] ?? null,
        chainId,
        isConnecting: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err instanceof Error ? err.message : "Failed to connect wallet.",
      }));
    }
  }, [getProvider, switchToSepolia]);

  // Reflect account/network changes the user makes in their wallet UI.
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setState((s) => ({ ...s, address: accounts[0] ?? null }));
    };
    const onChain = (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      setState((s) => ({ ...s, chainId: Number(chainIdHex) }));
    };

    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged", onChain);
    };
  }, []);

  const onWrongNetwork =
    state.address !== null && state.chainId !== SEPOLIA_CHAIN_ID;

  return { ...state, connect, switchToSepolia, getSigner, getProvider, onWrongNetwork };
}
