import {
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    useEffect,
} from "react";
import { Provider } from "@massalabs/massa-web3";
import { getWallets, Wallet } from "@massalabs/wallet-provider";

interface WalletContextValue {
    provider?: Provider | any;
    address?: string;
    nativeBalance: bigint;
    isConnecting: boolean;
    error?: string;
    availableWallets: Wallet[];
    connect: () => Promise<void>;
    connectToWallet: (wallet: Wallet) => Promise<void>;
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
        const num = parseFloat(value);
        if (!isNaN(num)) {
            return BigInt(Math.floor(num * 1e9));
        }
        return BigInt(value);
    }
    if (typeof value === "object" && value !== null) {
        const maybe = value as {
            balance?: string | number;
            candidate_balance?: string | number;
            candidateBalance?: string | number;
            finalBalance?: string | number;
            final_balance?: string | number;
        };
        const balanceStr = maybe.finalBalance ??
            maybe.candidateBalance ??
            maybe.final_balance ??
            maybe.candidate_balance ??
            maybe.balance;

        if (balanceStr !== undefined) {
            const balanceValue = typeof balanceStr === 'string' ? balanceStr : balanceStr.toString();
            const num = parseFloat(balanceValue);
            if (!isNaN(num)) {
                return BigInt(Math.floor(num * 1e9));
            }
            return BigInt(balanceValue);
        }
    }
    return 0n;
};

export function WalletProvider({ children }: PropsWithChildren) {
    const [provider, setProvider] = useState<Provider | any>();
    const [address, setAddress] = useState<string>();
    const [nativeBalance, setNativeBalance] = useState<bigint>(0n);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string>();
    const [availableWallets, setAvailableWallets] = useState<Wallet[]>([]);

    const fetchNativeBalance = useCallback(
        async (source?: Provider | any) => {
            const current = source ?? provider;

            // If we have an address, try to get balance via RPC first (most reliable)
            if (address) {
                try {
                    const response = await fetch('https://buildnet.massa.net/api/v2', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'get_addresses',
                            params: [[address]]
                        })
                    });

                    const data = await response.json();

                    if (data?.result && Array.isArray(data.result) && data.result.length > 0) {
                        const accountInfo = data.result[0];
                        const balance = accountInfo.candidate_balance || accountInfo.final_balance || accountInfo.balance || '0';
                        const normalized = normalizeBalance(balance);
                        setNativeBalance(normalized);
                        return;
                    }
                } catch (err) {
                    // RPC balance fetch failed
                }
            }

            if (!current) {
                return;
            }

            try {
                let balanceResult: unknown;

                if (typeof (current as unknown as { balance?: () => Promise<unknown> }).balance === "function") {
                    try {
                        balanceResult = await (
                            current as unknown as { balance: () => Promise<unknown> }
                        ).balance();

                        if (balanceResult && typeof balanceResult === 'object' && !Array.isArray(balanceResult)) {
                            const balanceObj = balanceResult as { finalBalance?: string; candidateBalance?: string };
                            const balanceValue = balanceObj.finalBalance || balanceObj.candidateBalance;
                            if (balanceValue) {
                                const normalized = normalizeBalance(balanceValue);
                                setNativeBalance(normalized);
                                return;
                            }
                        }

                        const normalized = normalizeBalance(balanceResult);
                        setNativeBalance(normalized);
                        return;
                    } catch (err) {
                        // balance() method failed
                    }
                }

                if (typeof (current as any).account === 'function') {
                    try {
                        const accountDetails = await (current as any).account();
                        if (accountDetails?.balance !== undefined) {
                            const normalized = normalizeBalance(accountDetails.balance);
                            setNativeBalance(normalized);
                            return;
                        }
                    } catch (err) {
                        // Account details method failed
                    }
                }

                if (typeof (current as any).getBalance === 'function') {
                    try {
                        balanceResult = await (current as any).getBalance();
                        const normalized = normalizeBalance(balanceResult);
                        setNativeBalance(normalized);
                        return;
                    } catch (err) {
                        // getBalance() method failed
                    }
                }

                setNativeBalance(0n);
            } catch (err) {
                console.error("Failed to fetch balance", err);
                setNativeBalance(0n);
            }
        },
        [provider, address],
    );

    const loadAvailableWallets = useCallback(async () => {
        try {
            const wallets = await getWallets();
            setAvailableWallets(wallets);
        } catch (err) {
            // Failed to load wallets
        }
    }, []);

    const connectToWallet = useCallback(async (wallet: Wallet) => {
        setIsConnecting(true);
        setError(undefined);
        try {
            if (wallet.connect && typeof wallet.connect === 'function') {
                const connected = await wallet.connect();
                if (!connected) {
                    setError(`Failed to connect to ${wallet.name()}`);
                    return;
                }
            }

            const accounts = await wallet.accounts();
            if (!accounts.length) {
                setError(`No accounts found in ${wallet.name()}. Please create an account first.`);
                return;
            }

            const account = accounts[0];
            setProvider(account);

            let nextAddress: string | undefined;

            try {
                const accountAny = account as any;
                if (accountAny.address) {
                    if (typeof accountAny.address === 'function') {
                        nextAddress = await accountAny.address();
                    } else {
                        nextAddress = typeof accountAny.address === 'string'
                            ? accountAny.address
                            : accountAny.address.toString();
                    }
                } else if (accountAny._address) {
                    nextAddress = accountAny._address;
                } else if (accountAny.getAddress && typeof accountAny.getAddress === 'function') {
                    nextAddress = await accountAny.getAddress();
                }
            } catch (e) {
                // Failed to get address
            }

            if (!nextAddress) {
                setError(
                    `Could not retrieve wallet address from ${wallet.name()}. ` +
                    `Please ensure your wallet is unlocked, has at least one account, and try refreshing the page.`
                );
                return;
            }

            setAddress(nextAddress);
            await fetchNativeBalance(account);
        } catch (err) {
            console.error("Wallet connection failed", err);
            setError(err instanceof Error ? err.message : "Failed to connect wallet. Check console for details.");
        } finally {
            setIsConnecting(false);
        }
    }, [fetchNativeBalance]);

    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(undefined);
        try {
            const wallets = await getWallets();
            setAvailableWallets(wallets);

            if (wallets.length === 0) {
                setError("No wallet providers detected. Please install MassaStation or Bearby extension.");
                return;
            }

            if (wallets.length === 1) {
                await connectToWallet(wallets[0]);
                return;
            }

            setError("Please select a wallet to connect");
        } catch (err) {
            console.error("Wallet connection failed", err);
            setError("Failed to connect wallet. Check console for details.");
        } finally {
            setIsConnecting(false);
        }
    }, [connectToWallet]);

    const disconnect = useCallback(async () => {
        setProvider(undefined);
        setAddress(undefined);
        setNativeBalance(0n);
    }, []);

    // Load wallets on mount
    useEffect(() => {
        void loadAvailableWallets();
    }, [loadAvailableWallets]);

    const value = useMemo(
        () => ({
            provider,
            address,
            nativeBalance,
            isConnecting,
            error,
            availableWallets,
            connect,
            connectToWallet,
            disconnect,
            refreshNativeBalance: fetchNativeBalance,
        }),
        [address, connect, connectToWallet, disconnect, error, fetchNativeBalance, isConnecting, nativeBalance, provider, availableWallets],
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

