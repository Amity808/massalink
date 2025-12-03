import {
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    PaymentDashboardSnapshot,
    PaymentEvent,
    PaymentLink,
} from "../types/payment";
import {
    createPaymentLink,
    getAddressForName,
    getDashboardSnapshot,
    getEvents,
    getPaymentLinkRaw,
    isNameAvailable,
    registerName,
} from "../lib/mockPaymentService";
import { registerNameOnChain, getRegisteredNameForAddress, createPaymentLinkOnChain, payToNameOnChain, payToLinkOnChain, getMyLinksOnChain, getBalanceOnChain, withdrawOnChain } from "../lib/contractClient";
import { useWallet } from "./WalletContext";

interface PaymentContextValue {
    snapshot?: PaymentDashboardSnapshot;
    links: PaymentLink[];
    events: PaymentEvent[];
    isLoading: boolean;
    isRegistering: boolean;
    isProcessing: boolean;
    refresh: () => Promise<void>;
    registerUserName: (name: string) => Promise<void>;
    createLink: (description: string, amount?: number) => Promise<string>;
    payToName: (name: string, amount: number, memo?: string) => Promise<string>;
    payToLink: (linkId: string, amount: number) => Promise<string>;
    withdrawFunds: () => Promise<number | undefined>;
    lookupAddress: (name: string) => Promise<string | null>;
    checkNameAvailability: (name: string) => Promise<boolean>;
    inspectLink: (linkId: string) => Promise<{ raw: string } | null>;
}

const PaymentContext = createContext<PaymentContextValue | undefined>(undefined);

export function PaymentProvider({ children }: PropsWithChildren) {
    const { address, provider } = useWallet();
    const [snapshot, setSnapshot] = useState<PaymentDashboardSnapshot>();
    const [links, setLinks] = useState<PaymentLink[]>([]);
    const [events, setEvents] = useState<PaymentEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const load = useCallback(async () => {
        if (!address) {
            setSnapshot(undefined);
            setLinks([]);
            setEvents([]);
            return;
        }
        setIsLoading(true);
        try {
            const [snap, onChainLinks, history, registeredName, contractBalance] = await Promise.all([
                getDashboardSnapshot(address),
                getMyLinksOnChain(address),
                getEvents(address),
                getRegisteredNameForAddress(provider!, address),
                getBalanceOnChain(address),
            ]);

            const paymentLinks: PaymentLink[] = onChainLinks.map((link) => ({
                id: link.id,
                description: link.description,
                amountType: link.amount === null ? "any" : "fixed",
                targetAmount: link.amount || undefined,
                totalReceived: link.totalReceived || 0,
                createdAt: new Date().toISOString(),
            }));

            const enrichedSnapshot = {
                ...snap,
                registeredName: registeredName || snap?.registeredName,
                totalLinks: paymentLinks.length,
                contractBalance: contractBalance,
            };

            setSnapshot(enrichedSnapshot);
            setLinks(paymentLinks);
            setEvents(history);
        } catch (error) {
            console.error("Failed to load payment data", error);
        } finally {
            setIsLoading(false);
        }
    }, [address, provider]);

    useEffect(() => {
        void load();
    }, [load]);

    const registerUserName = useCallback(
        async (name: string) => {
            if (!address || !provider) {
                throw new Error("Wallet not connected");
            }
            setIsRegistering(true);
            try {
                await registerNameOnChain(provider, name);
                await registerName(address, name);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await load();
            } finally {
                setIsRegistering(false);
            }
        },
        [address, load, provider],
    );

    const createLinkAction = useCallback(
        async (description: string, amount?: number) => {
            if (!address || !provider) {
                throw new Error("Wallet not connected");
            }
            setIsProcessing(true);
            try {
                const linkId = await createPaymentLinkOnChain(provider, description, amount);
                await createPaymentLink(address, { description, amount });
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await load();
                return linkId;
            } finally {
                setIsProcessing(false);
            }
        },
        [address, load, provider],
    );

    const payToNameAction = useCallback(
        async (name: string, amount: number, _memo?: string) => {
            if (!provider) {
                throw new Error("Wallet not connected");
            }
            setIsProcessing(true);
            try {
                const operationId = await payToNameOnChain(provider, name, amount);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await load();
                return operationId;
            } finally {
                setIsProcessing(false);
            }
        },
        [load, provider],
    );

    const payToLinkAction = useCallback(
        async (linkId: string, amount: number) => {
            if (!provider) {
                throw new Error("Wallet not connected");
            }
            setIsProcessing(true);
            try {
                const operationId = await payToLinkOnChain(provider, linkId, amount);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await load();
                return operationId;
            } finally {
                setIsProcessing(false);
            }
        },
        [load, provider],
    );

    const withdrawFunds = useCallback(async () => {
        if (!provider || !address) {
            throw new Error("Wallet not connected");
        }
        setIsProcessing(true);
        try {
            const balanceBefore = await getBalanceOnChain(address);
            if (balanceBefore <= 0) {
                throw new Error("No balance to withdraw");
            }

            await withdrawOnChain(provider);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await load();

            return balanceBefore;
        } finally {
            setIsProcessing(false);
        }
    }, [address, provider, load]);

    const value = useMemo(
        () => ({
            snapshot,
            links,
            events,
            isLoading,
            isRegistering,
            isProcessing,
            refresh: load,
            registerUserName,
            createLink: createLinkAction,
            payToName: payToNameAction,
            payToLink: payToLinkAction,
            withdrawFunds,
            lookupAddress: getAddressForName,
            checkNameAvailability: isNameAvailable,
            inspectLink: async (linkId: string) => {
                try {
                    return await getPaymentLinkRaw(linkId);
                } catch (error) {
                    console.error(error);
                    return null;
                }
            },
        }),
        [
            snapshot,
            links,
            events,
            isLoading,
            isRegistering,
            isProcessing,
            load,
            registerUserName,
            createLinkAction,
            payToNameAction,
            payToLinkAction,
            withdrawFunds
        ],
    );

    return (
        <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
    );
}

export function usePaymentData() {
    const ctx = useContext(PaymentContext);
    if (!ctx) {
        throw new Error("usePaymentData must be used within PaymentProvider");
    }
    return ctx;
}

