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
    getLinks,
    getPaymentLinkRaw,
    isNameAvailable,
    recordPaymentToLink,
    recordPaymentToName,
    registerName,
    withdraw,
} from "../lib/mockPaymentService";
import { registerNameOnChain, getRegisteredNameForAddress, createPaymentLinkOnChain, payToNameOnChain, payToLinkOnChain } from "../lib/contractClient";
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
            const [snap, userLinks, history, registeredName] = await Promise.all([
                getDashboardSnapshot(address),
                getLinks(address),
                getEvents(address),
                provider ? getRegisteredNameForAddress(provider, address) : Promise.resolve(null),
            ]);

            console.log("Loaded payment data:", {
                address,
                registeredName,
                mockSnapshotName: snap?.registeredName,
            });

            // Merge the on-chain registered name with the snapshot (on-chain takes priority)
            const enrichedSnapshot = registeredName
                ? { ...snap, registeredName }
                : snap;

            setSnapshot(enrichedSnapshot);
            setLinks(userLinks);
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
                // Update mock service to stay in sync
                await registerName(address, name);
                // Wait a bit for storage to finalize, then reload
                await new Promise((resolve) => setTimeout(resolve, 2000));
                // Reload to fetch the registered name from contract
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
                // Update mock service to stay in sync
                await createPaymentLink(address, { description, amount });
                // Wait a bit for storage to finalize, then reload
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
        async (name: string, amount: number, memo?: string) => {
            if (!provider) {
                throw new Error("Wallet not connected");
            }
            setIsProcessing(true);
            try {
                const operationId = await payToNameOnChain(provider, name, amount);
                // Update mock service to stay in sync
                await recordPaymentToName(name, amount, memo);
                // Wait a bit for storage to finalize, then reload
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
                // Update mock service to stay in sync
                await recordPaymentToLink(linkId, amount);
                // Wait a bit for storage to finalize, then reload
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
        if (!address) return;
        setIsProcessing(true);
        try {
            const amount = await withdraw(address);
            await load();
            return amount;
        } finally {
            setIsProcessing(false);
        }
    }, [address, load]);

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

