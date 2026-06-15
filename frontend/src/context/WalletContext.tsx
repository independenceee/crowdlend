"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {BrowserWallet} from "@meshsdk/core"

interface WalletState {
    wallet: any | null;
    address: string | null;
    pkh: string | null;
    networkId: number | null;
    isConnecting: boolean;
    connect: (walletId: string) => Promise<void>;
    disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
    wallet: null,
    address: null,
    pkh: null,
    networkId: null,
    isConnecting: false,
    connect: async () => {},
    disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
    const [wallet, setWallet] = useState<any | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [pkh, setPkh] = useState<string | null>(null);
    const [networkId, setNetworkId] = useState<number | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const connect = useCallback(async (walletId: string) => {
        setIsConnecting(true);
        try {
            const w = await BrowserWallet.enable(walletId);
            const addr = await w.getChangeAddress();
            const netId = await w.getNetworkId();

            const { resolvePaymentKeyHash } = await import("@meshsdk/core-cst");
            const keyHash = resolvePaymentKeyHash(addr);

            setWallet(w);
            setAddress(addr);
            setPkh(keyHash);
            setNetworkId(netId);
        } catch (err) {
            console.error("Failed to connect wallet:", err);
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setWallet(null);
        setAddress(null);
        setPkh(null);
        setNetworkId(null);
    }, []);

    return <WalletContext.Provider value={{ wallet, address, pkh, networkId, isConnecting, connect, disconnect }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
    return useContext(WalletContext);
}
