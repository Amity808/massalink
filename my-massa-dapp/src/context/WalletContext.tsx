import {
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { Provider } from "@massalabs/massa-web3";
import { getWallets, WalletName } from "@massalabs/wallet-provider";

interface WalletContextValue {
    provider?: Provider;
    address?: string;
    nativeBalance: bigint;
    isConnecting: boolean;
    error?: string;
    connect: () => Promise<void>;
    disconnect: () => void;
    refreshNativeBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const normalizeBalance = (value: unknown): bigint => {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isFinite(value)) {
        return BigInt(Math.trunc(value));
    }
    if (typeof value === "string" && value.trim() !== "") {
        return BigInt(value);
    }
    if (typeof value === "object" && value !== null) {
        const maybe = value as { balance?: string; candidate_balance?: string };
        const candidate = maybe.balance ?? maybe.candidate_balance;
        if (candidate) {
            return BigInt(candidate);
        }
    }
    return 0n;
};

export function WalletProvider({ children }: PropsWithChildren) {
    const [provider, setProvider] = useState<Provider>();
    const [address, setAddress] = useState<string>();
    const [nativeBalance, setNativeBalance] = useState<bigint>(0n);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string>();

    const fetchNativeBalance = useCallback(
        async (source?: Provider) => {
            const current = source ?? provider;
            if (
                !current ||
                typeof (current as unknown as { balance?: () => Promise<unknown> }).balance !==
                "function"
            ) {
                return;
            }
            try {
                const balanceResult = await (
                    current as unknown as { balance: () => Promise<unknown> }
                ).balance();
                setNativeBalance(normalizeBalance(balanceResult));
            } catch (err) {
                console.error("Failed to fetch balance", err);
            }
        },
        [provider],
    );

    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(undefined);
        try {
            const wallets = await getWallets();
            const wallet = wallets.find(
                (candidate: { name: () => WalletName }) => candidate.name() === WalletName.MassaWallet,
            );
            if (!wallet) {
                setError("MassaWallet not detected");
                return;
            }
            const accounts = await wallet.accounts();
            if (!accounts.length) {
                setError("No MassaWallet accounts found");
                return;
            }
            const nextProvider = accounts[0];
            setProvider(nextProvider);
            const nextAddress = await nextProvider.address;
            setAddress(nextAddress);
            await fetchNativeBalance(nextProvider);
        } catch (err) {
            console.error("Wallet connection failed", err);
            setError("Failed to connect wallet. Check console for details.");
        } finally {
            setIsConnecting(false);
        }
    }, [fetchNativeBalance]);

    const disconnect = useCallback(() => {
        setProvider(undefined);
        setAddress(undefined);
        setNativeBalance(0n);
    }, []);

    const value = useMemo(
        () => ({
            provider,
            address,
            nativeBalance,
            isConnecting,
            error,
            connect,
            disconnect,
            refreshNativeBalance: fetchNativeBalance,
        }),
        [address, connect, disconnect, error, fetchNativeBalance, isConnecting, nativeBalance, provider],
    );

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
    const ctx = useContext(WalletContext);
    if (!ctx) {
        throw new Error("useWallet must be used within WalletProvider");
    }
    return ctx;
}

